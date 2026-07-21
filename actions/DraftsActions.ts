// actions/DraftsActions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { parseAndMapUnstructuredInput, ExtractedIngredientDraft } from "@/lib/ai-pipeline";
import { DraftStatus, RecipeStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireOwnerAuth } from "@/lib/Authentication/RequireOwnerAuth";
import {
    submitDraftSchema,
    resolveDraftSchema,
    deleteDraftSchema,
} from "@/lib/validations/draft-schema";
import {deleteDraftRateLimiter} from "@/lib/RateLimiter/rate-limiter";

type FinalizedIngredient = {
    resolved_ingredient_id: number | null;
    stated_amount: string;
    calculated_grams: number | string;
};

type AIResolvedIngredient = ExtractedIngredientDraft & {
    resolved_ingredient_id: number | null;
};

// ─── Submit Raw Draft ──────────────────────────────────────────────────────────
export async function submitRawDraft(arg1: unknown, arg2?: unknown) {
    // 🚨 SECURITY 1: Auth Wall
    const { userId, restaurantId } = await requireOwnerAuth();

    // 🚨 Smart Payload: Handle if client sends (mockUser, payload) OR just (payload)
    const payload = arg2 !== undefined ? arg2 : arg1;

    // 🚨 SECURITY 2: Validation
    const validated = submitDraftSchema.safeParse(payload);
    if (!validated.success) {
        return { success: false, message: validated.error.issues[0].message };
    }

    const { raw_text, image_url } = validated.data;

    try {
        let aiGeneratedIngredients: AIResolvedIngredient[] = [];

        if (image_url) {
            aiGeneratedIngredients = await parseAndMapUnstructuredInput(raw_text, image_url);
        }

        // 🚨 SECURITY 3: Tenant Isolation applied on creation
        await prisma.recipeDraft.create({
            data: {
                restaurant_id: restaurantId,
                raw_input_text: raw_text,
                image_url: image_url || "",
                status: DraftStatus.RESOLVED,
                extracted_json: aiGeneratedIngredients as unknown as object,
            },
        });

        revalidatePath("/owner/drafts");
        return { success: true, message: "Draft analyzed and created!" };
    } catch (error: unknown) {
        console.error("❌ Draft Submission Error:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to process draft with AI.";
        return { success: false, message: errorMessage };
    }
}

// ─── Resolve Draft to Recipe ──────────────────────────────────────────────────
export async function resolveDraftToRecipe(arg1: unknown, arg2?: unknown) {
    // 🚨 SECURITY 1: Auth Wall
    const { userId, restaurantId } = await requireOwnerAuth();

    // 🚨 Smart Payload: Prevents schema failure if the form sends the mockUser first
    const payload = arg2 !== undefined ? arg2 : arg1;

    // 🚨 SECURITY 2: Validation
    const validated = resolveDraftSchema.safeParse(payload);
    if (!validated.success) {
        return { success: false, message: validated.error.issues[0].message };
    }

    const { draftId, finalizedIngredients } = validated.data;

    try {
        // 🚨 SECURITY 3: Tenant Isolation Verification
        const draft = await prisma.recipeDraft.findFirst({
            where: {
                id: draftId,
                restaurant_id: restaurantId
            }
        });

        if (!draft) {
            console.error(`🚨 [SECURITY] Unauthorized resolution attempt on Draft ID: ${draftId}`);
            throw new Error("Draft not found or access denied.");
        }

        // 1. Filter out ingredients without a resolved ID
        const validIngredients = finalizedIngredients.filter(
            (ing) => ing.resolved_ingredient_id !== null && ing.resolved_ingredient_id !== undefined
        );

        // 2. Fetch nutritional data for all resolved ingredients
        const ingredientIds = validIngredients.map((ing) => ing.resolved_ingredient_id as number);
        const references = await prisma.ingredientReference.findMany({
            where: { id: { in: ingredientIds } },
            select: { id: true, calories_per_g: true, protein_per_g: true, carbs_per_g: true, fat_per_g: true },
        });

        const refMap = new Map(references.map((ref) => [ref.id, ref]));

        // 3. Compute totals
        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFat = 0;

        const ingredientCreates = validIngredients.map((ing) => {
            const ref = refMap.get(ing.resolved_ingredient_id as number);
            const grams = Number(ing.calculated_grams) || 0;

            if (ref) {
                totalCalories += ref.calories_per_g.toNumber() * grams;
                totalProtein += ref.protein_per_g.toNumber() * grams;
                totalCarbs += ref.carbs_per_g.toNumber() * grams;
                totalFat += ref.fat_per_g.toNumber() * grams;
            }

            return {
                user_stated_amount: ing.stated_amount,
                normalized_grams: grams,
                ingredient_item: { connect: { id: ing.resolved_ingredient_id as number } },
            };
        });

        // 4. Secure Database Transaction
        const newRecipe = await prisma.$transaction(async (tx) => {
            // Create the recipe
            const recipe = await tx.recipe.create({
                data: {
                    restaurant_id: restaurantId,
                    meal_name: `Recipe from Draft #${draft.id}`,
                    preparation_notes: draft.raw_input_text || "",
                    image_url: draft.image_url || "",
                    status: RecipeStatus.PENDING,
                    calories: totalCalories,
                    protein: totalProtein,
                    carbs: totalCarbs,
                    total_fat: totalFat,
                    ingredients: { create: ingredientCreates },
                },
            });

            // Delete the draft now that it is resolved
            await tx.recipeDraft.deleteMany({
                where: { id: draftId, restaurant_id: restaurantId }
            });

            // Log the action (casting ID to Number)
            await tx.auditLog.create({
                data: {
                    actor_id: Number(userId),
                    restaurant_id: restaurantId,
                    recipe_id: recipe.id,
                    action: "RECIPE_CREATED_FROM_DRAFT",
                    payload: { draft_id: draftId },
                }
            });

            return recipe;
        });

        revalidatePath("/owner/drafts");
        revalidatePath("/owner/recipes");
        return { success: true, recipeId: newRecipe.id };
    } catch (error: unknown) {
        console.error("❌ Resolution Error:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to save recipe to database.";
        return { success: false, message: errorMessage };
    }
}

// ─── Get Drafts ────────────────────────────────────────────────────────────────
export async function getDrafts(_mockUser?: unknown) {
    // 🚨 SECURITY 1: Auth Wall
    const { restaurantId } = await requireOwnerAuth();

    try {
        // 🚨 SECURITY 3: Tenant Isolation
        const drafts = await prisma.recipeDraft.findMany({
            where: {
                restaurant_id: restaurantId,
                status: DraftStatus.RESOLVED
            },
            orderBy: { created_at: "desc" },
        });
        return { success: true, data: drafts };
    } catch (error) {
        console.error("❌ Get drafts error:", error);
        return { success: false, message: "Failed to fetch drafts." };
    }
}

// ─── Delete Draft ──────────────────────────────────────────────────────────────
export async function deleteDraft(arg1: unknown, arg2?: unknown) {
    // 1. Auth Wall
    const { userId, restaurantId } = await requireOwnerAuth();

    // 2. Rate Limiter Check
    const { success: rateLimitSuccess, reset } = await deleteDraftRateLimiter.limit(String(userId));
    if (!rateLimitSuccess) {
        const secondsUntilReset = Math.ceil((reset - Date.now()) / 1000);
        return {
            success: false,
            message: `Too many delete requests. Please wait ${secondsUntilReset}s.`
        };
    }

    // 3. Payload Normalization & Validation
    const payload = arg2 !== undefined ? arg2 : arg1;

    // Normalize payload format: accepts { id: 1 }, { ids: [1, 2] }, or raw [1, 2] / 1
    const rawIds = typeof payload === "object" && payload !== null && "id" in payload
        ? (payload as { id: unknown }).id
        : typeof payload === "object" && payload !== null && "ids" in payload
            ? (payload as { ids: unknown }).ids
            : payload;

    const validated = deleteDraftSchema.safeParse({ ids: rawIds });
    if (!validated.success) {
        return { success: false, message: validated.error.issues[0].message };
    }

    const draftIds = validated.data.ids;

    if (draftIds.length === 0) {
        return { success: false, message: "No draft IDs provided." };
    }

    try {
        await prisma.$transaction(async (tx) => {
            // 4. Tenant Isolation Bulk Delete
            const result = await tx.recipeDraft.deleteMany({
                where: {
                    id: { in: draftIds },
                    restaurant_id: restaurantId
                }
            });

            if (result.count === 0) {
                throw new Error("No matching drafts found or access denied.");
            }

            // 5. Bulk Audit Log
            await tx.auditLog.create({
                data: {
                    actor_id: Number(userId),
                    restaurant_id: restaurantId,
                    action: "DRAFT_DELETED",
                    payload: { draft_ids: draftIds, deleted_count: result.count },
                }
            });
        });

        revalidatePath("/owner/drafts");
        return {
            success: true,
            message: draftIds.length === 1
                ? "Draft deleted."
                : `${draftIds.length} drafts deleted successfully.`
        };
    } catch (error: unknown) {
        console.error("❌ Delete draft error:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to delete draft(s).";
        return { success: false, message: errorMessage };
    }
}

// ─── Get Own Certification Status ─────────────────────────────────────────────
export async function getOwnCertificationStatus(_mockUser?: unknown) {
    const { restaurantId } = await requireOwnerAuth();

    try {
        const restaurant = await prisma.restaurant.findUnique({
            where: { id: restaurantId },
            select: {
                cert_level: true,
                cert_status: true,
                recipes: {
                    select: { status: true },
                },
            },
        });

        if (!restaurant) throw new Error("Restaurant not found.");

        const totalRecipes = restaurant.recipes.length;
        const pending = restaurant.recipes.filter((r) => r.status === RecipeStatus.PENDING).length;
        const approved = restaurant.recipes.filter((r) => r.status === RecipeStatus.APPROVED).length;
        const rejected = restaurant.recipes.filter((r) => r.status === RecipeStatus.REJECTED).length;
        const revoked = restaurant.recipes.filter((r) => r.status === RecipeStatus.REVOKED).length;

        return {
            success: true,
            data: {
                cert_level: restaurant.cert_level,
                cert_status: restaurant.cert_status,
                recipeBreakdown: { total: totalRecipes, pending, approved, rejected, revoked },
            },
        };
    } catch (error) {
        console.error("❌ Get certification status error:", error);
        return { success: false, message: "Failed to fetch certification status." };
    }
}

// ─── Get Kitchen Profile ──────────────────────────────────────────────────────
export async function getKitchenProfile(_mockUser?: unknown) {
    const { restaurantId } = await requireOwnerAuth();

    try {
        const profile = await prisma.kitchenControlProfile.findUnique({
            where: { restaurantId }, // Implicit Tenant Isolation
        });

        if (!profile) {
            return {
                success: true,
                data: {
                    hasDedicatedAllergenZones: false,
                    usesStandardizedRecipes: false,
                },
            };
        }

        return { success: true, data: profile };
    } catch (error) {
        console.error("❌ Get kitchen profile error:", error);
        return { success: false, message: "Failed to fetch kitchen profile." };
    }
}