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
    try {
        await assertUserAccess(currentUser, [Role.restaurant_owner], currentUser.restaurantId);

        if (!currentUser.restaurantId) {
            return { success: false, message: "No tenant restaurant associated with this user." };
        }

        // 1. Create processing draft record
        const draft = await prisma.recipeDraft.create({
            data: {
                restaurant_id: currentUser.restaurantId,
                raw_input_text: payload.raw_text,
                image_url: payload.image_url,
                status: DraftStatus.PROCESSING,
            },
        });

        // 2. Process with the Extraction Engine
        try {
            const resolvedMappings = await parseAndMapUnstructuredInput(payload.raw_text);

            // Save structured payload representation to draft
            await prisma.recipeDraft.update({
                where: { id: draft.id },
                data: {
                    extracted_json: JSON.parse(JSON.stringify(resolvedMappings)),
                    status: DraftStatus.RESOLVED,
                },
            });
        } catch (parseError: unknown) {
            const parseErrorMessage = parseError instanceof Error ? parseError.message : String(parseError);

            // Gracefully capture resolution pipeline failures
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
 * Runs Math Guardrails directly on Database parameters.
 */
export async function resolveDraftToRecipe(
    currentUser: SessionUser,
    payload: ConfirmDraftPayload
) {
    try {
        await assertUserAccess(currentUser, [Role.restaurant_owner], currentUser.restaurantId);

        if (!currentUser.restaurantId) {
            return { success: false, message: "No tenant restaurant associated with this user." };
        }

        const draft = await prisma.recipeDraft.findFirst({
            where: { id: payload.draft_id, restaurant_id: currentUser.restaurantId },
        });

        if (!draft) {
            return { success: false, message: "Draft context not found." };
        }

        let totalCalories = new Prisma.Decimal(0);
        let totalProtein = new Prisma.Decimal(0);
        let totalCarbs = new Prisma.Decimal(0);
        let totalFat = new Prisma.Decimal(0);

        // Create a Set to collect unique allergens automatically
        const aggregatedAllergens = new Set<string>();

        const ingredientRefs = await prisma.ingredientReference.findMany({
            where: { id: { in: payload.ingredients.map((i) => i.ingredient_id) } },
        });

        const refMap = new Map(ingredientRefs.map((r) => [r.id, r]));

        await prisma.$transaction(async (tx) => {
            // 1. Create the base recipe
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

            // 2. Loop through ingredients to do the math AND collect allergens
            for (const rawIng of payload.ingredients) {
                const ref = refMap.get(rawIng.ingredient_id);
                if (!ref) throw new Error(`Missing ingredient record: ${rawIng.ingredient_id}`);

                const grams = new Prisma.Decimal(rawIng.normalized_grams);
                totalCalories = totalCalories.add(ref.calories_per_g.mul(grams));
                totalProtein = totalProtein.add(ref.protein_per_g.mul(grams));
                totalCarbs = totalCarbs.add(ref.carbs_per_g.mul(grams));
                totalFat = totalFat.add(ref.fat_per_g.mul(grams));

                // Pull the allergens array from the database reference and add to our Set
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

            // 3. Update the recipe with final math AND the flattened allergen array
            await tx.recipe.update({
                where: { id: recipe.id },
                data: {
                    calories: totalCalories,
                    protein: totalProtein,
                    carbs: totalCarbs,
                    total_fat: totalFat,
                    detected_allergens: Array.from(aggregatedAllergens), // Convert Set back to Array
                },
            });

            // Remove the draft now that it's successfully migrated
            await tx.recipeDraft.delete({ where: { id: payload.draft_id } });

            // Log compliance events for administrative/JFDA audits
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