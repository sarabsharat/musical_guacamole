// actions/DraftsActions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { assertUserAccess, getSession } from "@/lib/security";
import { parseAndMapUnstructuredInput, ExtractedIngredientDraft } from "@/lib/ai-pipeline";
import { Role, DraftStatus, RecipeStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireOwnerAuth } from "@/lib/RequireOwnerAuth";
import {
    submitDraftSchema,
    resolveDraftSchema,
    deleteDraftSchema,
} from "@/lib/validations/draft-schema"; // 👈 use your existing file

type FinalizedIngredient = {
    resolved_ingredient_id: number | null;
    stated_amount: string;
    calculated_grams: number | string;
};

type AIResolvedIngredient = ExtractedIngredientDraft & {
    resolved_ingredient_id: number | null;
};

// ─── Submit Raw Draft ──────────────────────────────────────────────────────────
export async function submitRawDraft(payload: unknown) {
    const { restaurantId } = await requireOwnerAuth();

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
        console.error("Draft Submission Error:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to process draft with AI.";
        return { success: false, message: errorMessage };
    }
}

// ─── Resolve Draft to Recipe ──────────────────────────────────────────────────
export async function resolveDraftToRecipe(payload: unknown) {
    const validated = resolveDraftSchema.safeParse(payload);
    if (!validated.success) {
        return { success: false, message: validated.error.issues[0].message };
    }

    const { draftId, finalizedIngredients } = validated.data;

    try {
        const draft = await prisma.recipeDraft.findUnique({ where: { id: draftId } });
        if (!draft) throw new Error("Draft not found.");

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

        // 3. Build a map for fast lookup
        const refMap = new Map(references.map((ref) => [ref.id, ref]));

        // 4. Compute totals
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

        // 5. Create the recipe with computed values
        const newRecipe = await prisma.recipe.create({
            data: {
                restaurant_id: draft.restaurant_id,
                meal_name: `Recipe from Draft #${draft.id}`,
                preparation_notes: draft.raw_input_text || "",
                image_url: draft.image_url || "",
                status: RecipeStatus.PENDING,
                calories: totalCalories,
                protein: totalProtein,
                carbs: totalCarbs,
                total_fat: totalFat,
                // You may also set detected_allergens, but we'll skip for now
                ingredients: { create: ingredientCreates },
            },
        });

        await prisma.recipeDraft.delete({ where: { id: draftId } });

        revalidatePath("/owner/drafts");
        revalidatePath("/owner/recipes");
        return { success: true, recipeId: newRecipe.id };
    } catch (error: unknown) {
        console.error("Resolution Error:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to save recipe to database.";
        return { success: false, message: errorMessage };
    }
}

// ─── Get Drafts ────────────────────────────────────────────────────────────────
export async function getDrafts() {
    await requireOwnerAuth();

    try {
        const drafts = await prisma.recipeDraft.findMany({
            where: { status: DraftStatus.RESOLVED }, // or all; adjust as needed
            orderBy: { created_at: "desc" },
        });
        return { success: true, data: drafts };
    } catch (error) {
        console.error("Get drafts error:", error);
        return { success: false, message: "Failed to fetch drafts." };
    }
}

// ─── Delete Draft ──────────────────────────────────────────────────────────────
export async function deleteDraft(payload: unknown) {
    const validated = deleteDraftSchema.safeParse(payload);
    if (!validated.success) {
        return { success: false, message: validated.error.issues[0].message };
    }

    const { id } = validated.data;

    try {
        await prisma.recipeDraft.delete({ where: { id } });
        revalidatePath("/owner/drafts");
        return { success: true, message: "Draft deleted." };
    } catch (error) {
        console.error("Delete draft error:", error);
        return { success: false, message: "Failed to delete draft." };
    }
}

// ─── Get Own Certification Status ─────────────────────────────────────────────
export async function getOwnCertificationStatus() {
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
        console.error("Get certification status error:", error);
        return { success: false, message: "Failed to fetch certification status." };
    }
}

// ─── Get Kitchen Profile ──────────────────────────────────────────────────────
export async function getKitchenProfile() {
    const { restaurantId } = await requireOwnerAuth();

    try {
        const profile = await prisma.kitchenControlProfile.findUnique({
            where: { restaurantId },
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
        console.error("Get kitchen profile error:", error);
        return { success: false, message: "Failed to fetch kitchen profile." };
    }
}