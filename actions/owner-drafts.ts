"use server";

import { prisma } from "@/lib/prisma";
import { assertUserAccess, getSession } from "@/lib/security";
import { parseAndMapUnstructuredInput } from "@/lib/ai-pipeline";
import { Role, DraftStatus, RecipeStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { SessionUser } from "@/lib/shared-types";
import { calculateServerRecipeTotals } from "@/lib/utils/server-recipe-math";
import { submitDraftSchema, confirmDraftSchema, SubmitDraftPayload, ConfirmDraftPayload } from "@/lib/validations/draft-schema";

export async function submitRawDraft(payload: SubmitDraftPayload) {
    const currentUser = await getSession();
    await assertUserAccess(currentUser, [Role.restaurant_owner], currentUser?.restaurantId);

    if (!currentUser || !currentUser.restaurantId) {
        throw new Error("Security Violation: No tenant context found.");
    }

    // 🛡️ Zod Validation
    const validated = submitDraftSchema.safeParse(payload);
    if (!validated.success) return { success: false, message: validated.error.issues[0].message };
    const { raw_text, image_url } = validated.data;

    try {
        const draft = await prisma.recipeDraft.create({
            data: {
                restaurant_id: currentUser.restaurantId,
                raw_input_text: raw_text,
                image_url: image_url,
                status: DraftStatus.PROCESSING,
            },
        });

        try {
            const resolvedMappings = await parseAndMapUnstructuredInput(raw_text);

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
        revalidatePath("/drafts");
        return { success: true, message: "Raw preparation notes ingested successfully." };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to submit draft.";
        return { success: false, message: errorMessage };
    }
}

export async function resolveDraftToRecipe(
    currentUser: SessionUser | null,
    payload: ConfirmDraftPayload
) {
    if (!currentUser) currentUser = await getSession();
    await assertUserAccess(currentUser, [Role.restaurant_owner], currentUser?.restaurantId);

    if (!currentUser || !currentUser.restaurantId) {
        throw new Error("Security Violation: No tenant context found.");
    }

    // 🛡️ Zod Validation
    const validated = confirmDraftSchema.safeParse(payload);
    if (!validated.success) return { success: false, message: validated.error.issues[0].message };
    const validData = validated.data;

    try {
        const draft = await prisma.recipeDraft.findFirst({
            where: { id: validData.draft_id, restaurant_id: currentUser.restaurantId },
        });

        if (!draft) return { success: false, message: "Draft context not found or access denied." };

        const ingredientRefs = await prisma.ingredientReference.findMany({
            where: { id: { in: validData.ingredients.map((i) => i.ingredient_id) } },
        });

        const totals = calculateServerRecipeTotals(validData.ingredients, ingredientRefs);

        await prisma.$transaction(async (tx) => {
            const recipe = await tx.recipe.create({
                data: {
                    restaurant_id: currentUser.restaurantId!,
                    meal_name: validData.meal_name,
                    image_url: draft.image_url || "",
                    preparation_notes: draft.raw_input_text,
                    calories: totals.calories,
                    protein: totals.protein,
                    carbs: totals.carbs,
                    total_fat: totals.total_fat,
                    detected_allergens: totals.detected_allergens,
                    status: RecipeStatus.PENDING,
                },
            });

            for (const rawIng of validData.ingredients) {
                await tx.recipeIngredient.create({
                    data: {
                        recipe_id: recipe.id,
                        ingredient_id: rawIng.ingredient_id,
                        user_stated_amount: rawIng.user_stated_amount,
                        normalized_grams: rawIng.normalized_grams,
                    },
                });
            }

            await tx.recipeDraft.delete({ where: { id: validData.draft_id } });

            await tx.auditLog.create({
                data: {
                    actor_id: currentUser.id,
                    restaurant_id: currentUser.restaurantId!,
                    recipe_id: recipe.id,
                    action: "RECIPE_RESOLVED_FROM_DRAFT",
                    payload: JSON.parse(
                        JSON.stringify({
                            meal_name: validData.meal_name,
                            calories: totals.calories,
                            allergens: totals.detected_allergens,
                        })
                    ),
                },
            });
        });

        revalidatePath("/owner/drafts");
        revalidatePath("/owner/recipes");
        return { success: true, message: "Recipe created, math verified, and allergens flagged." };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to resolve draft recipe.";
        return { success: false, message: errorMessage };
    }
}