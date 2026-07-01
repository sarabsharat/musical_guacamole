"use server";

import { prisma } from "@/lib/prisma";
import { assertUserAccess, SessionUser } from "@/lib/security";
import { parseAndMapUnstructuredInput } from "@/lib/ai-pipeline";
import { Role, DraftStatus, RecipeStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

/**
 * Generates a recipe draft from raw input text and triggers the parsing queue.
 */
export async function submitRawDraft(
    currentUser: SessionUser,
    payload: { raw_text: string; image_url: string }
) {
    // 🚨 GUARDRAIL OUTSIDE THE TRY/CATCH 🚨
    await assertUserAccess(currentUser, [Role.restaurant_owner], currentUser.restaurantId);

    if (!currentUser.restaurantId) {
        throw new Error("Security Violation: No tenant context found.");
    }

    try {
        const draft = await prisma.recipeDraft.create({
            data: {
                restaurant_id: currentUser.restaurantId,
                raw_input_text: payload.raw_text,
                image_url: payload.image_url,
                status: DraftStatus.PROCESSING,
            },
        });

        try {
            const resolvedMappings = await parseAndMapUnstructuredInput(payload.raw_text);

            await prisma.recipeDraft.update({
                where: { id: draft.id },
                data: {
                    extracted_json: JSON.parse(JSON.stringify(resolvedMappings)),
                    status: DraftStatus.RESOLVED,
                },
            });
        } catch (parseError: unknown) {
            const parseErrorMessage = parseError instanceof Error ? parseError.message : String(parseError);

            await prisma.recipeDraft.update({
                where: { id: draft.id },
                data: {
                    status: DraftStatus.FAILED,
                    error_message: parseErrorMessage || "Extraction pipeline failure.",
                },
            });
        }

        revalidatePath("/owner/drafts");
        return { success: true, message: "Raw preparation notes ingested successfully." };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to submit draft.";
        return { success: false, message: errorMessage };
    }
}

interface ConfirmDraftPayload {
    draft_id: number;
    meal_name: string;
    ingredients: Array<{
        ingredient_id: number;
        user_stated_amount: string;
        normalized_grams: number;
    }>;
}

/**
 * Commits a resolved RecipeDraft into an official compliance Recipe.
 */
export async function resolveDraftToRecipe(
    currentUser: SessionUser,
    payload: ConfirmDraftPayload
) {
    // 🚨 GUARDRAIL OUTSIDE THE TRY/CATCH 🚨
    await assertUserAccess(currentUser, [Role.restaurant_owner], currentUser.restaurantId);

    if (!currentUser.restaurantId) {
        throw new Error("Security Violation: No tenant context found.");
    }

    try {
        const draft = await prisma.recipeDraft.findFirst({
            where: {
                id: payload.draft_id,
                restaurant_id: currentUser.restaurantId
            },
        });

        if (!draft) {
            return { success: false, message: "Draft context not found or cross-tenant access denied." };
        }

        let totalCalories = new Prisma.Decimal(0);
        let totalProtein = new Prisma.Decimal(0);
        let totalCarbs = new Prisma.Decimal(0);
        let totalFat = new Prisma.Decimal(0);

        const aggregatedAllergens = new Set<string>();

        const ingredientRefs = await prisma.ingredientReference.findMany({
            where: { id: { in: payload.ingredients.map((i) => i.ingredient_id) } },
        });

        const refMap = new Map(ingredientRefs.map((r) => [r.id, r]));

        await prisma.$transaction(async (tx) => {
            const recipe = await tx.recipe.create({
                data: {
                    restaurant_id: currentUser.restaurantId!,
                    meal_name: payload.meal_name,
                    image_url: draft.image_url || "",
                    preparation_notes: draft.raw_input_text,
                    calories: 0,
                    protein: 0,
                    carbs: 0,
                    total_fat: 0,
                    status: RecipeStatus.PENDING,
                },
            });

            for (const rawIng of payload.ingredients) {
                const ref = refMap.get(rawIng.ingredient_id);
                if (!ref) throw new Error(`Missing ingredient record: ${rawIng.ingredient_id}`);

                const grams = new Prisma.Decimal(rawIng.normalized_grams);
                totalCalories = totalCalories.add(ref.calories_per_g.mul(grams));
                totalProtein = totalProtein.add(ref.protein_per_g.mul(grams));
                totalCarbs = totalCarbs.add(ref.carbs_per_g.mul(grams));
                totalFat = totalFat.add(ref.fat_per_g.mul(grams));

                if (ref.allergens && ref.allergens.length > 0) {
                    ref.allergens.forEach((allergen: string) => {
                        aggregatedAllergens.add(allergen);
                    });
                }

                await tx.recipeIngredient.create({
                    data: {
                        recipe_id: recipe.id,
                        ingredient_id: rawIng.ingredient_id,
                        user_stated_amount: rawIng.user_stated_amount,
                        normalized_grams: grams,
                    },
                });
            }

            await tx.recipe.update({
                where: { id: recipe.id },
                data: {
                    calories: totalCalories,
                    protein: totalProtein,
                    carbs: totalCarbs,
                    total_fat: totalFat,
                    detected_allergens: Array.from(aggregatedAllergens),
                },
            });

            await tx.recipeDraft.delete({ where: { id: payload.draft_id } });

            await tx.auditLog.create({
                data: {
                    actor_id: currentUser.id,
                    restaurant_id: currentUser.restaurantId!,
                    recipe_id: recipe.id,
                    action: "RECIPE_RESOLVED_FROM_DRAFT",
                    payload: JSON.parse(
                        JSON.stringify({
                            meal_name: payload.meal_name,
                            calories: totalCalories,
                            allergens: Array.from(aggregatedAllergens),
                        })
                    ),
                },
            });
        });

        revalidatePath("/owner/recipes");
        revalidatePath("/owner/drafts");
        return { success: true, message: "Recipe created, math verified, and allergens flagged." };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to resolve draft recipe.";
        return { success: false, message: errorMessage };
    }
}