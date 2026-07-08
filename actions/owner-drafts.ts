// actions/owner-drafts.ts
"use server";

import { prisma } from "@/lib/prisma";
import { assertUserAccess, getSession } from "@/lib/security";
import { parseAndMapUnstructuredInput, ExtractedIngredientDraft } from "@/lib/ai-pipeline";
import { Role, DraftStatus, RecipeStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { submitDraftSchema, SubmitDraftPayload } from "@/lib/validations/draft-schema";
import {requireOwnerAuth} from "@/lib/RequireOwnerAuth";

// 1. Define strict types to satisfy ESLint and TypeScript
type FinalizedIngredient = {
    resolved_ingredient_id: number | null;
    stated_amount: string;
    calculated_grams: number | string;
};

type AIResolvedIngredient = ExtractedIngredientDraft & {
    resolved_ingredient_id: number | null;
};

export async function submitRawDraft(payload: SubmitDraftPayload) {

    const {restaurantId} = await requireOwnerAuth();
    const validated = submitDraftSchema.safeParse(payload);
    if (!validated.success) return { success: false, message: "Invalid input" };

    const { raw_text, image_url } = validated.data;

    try {
        // 2. Explicitly type the array to satisfy TS7034 and TS7005
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
                // Use "unknown as object" instead of "any" to satisfy strict ESLint rules
                extracted_json: aiGeneratedIngredients as unknown as object,
            },
        });

        revalidatePath("/owner/drafts");
        return { success: true, message: "Draft analyzed and created!" };
    } catch (error: unknown) { // 3. Changed "any" to "unknown"
        console.error("Draft Submission Error:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to process draft with AI.";
        return { success: false, message: errorMessage };
    }
}

// 4. Added strict type for finalizedIngredients array
export async function resolveDraftToRecipe(draftId: number, finalizedIngredients: FinalizedIngredient[]) {
    try {
        const draft = await prisma.recipeDraft.findUnique({ where: { id: draftId } });
        if (!draft) throw new Error("Draft not found.");

        const validIngredients = finalizedIngredients.filter(
            (ing) => ing.resolved_ingredient_id !== null && ing.resolved_ingredient_id !== undefined
        );
        const response = await fetch('/api/ai/parse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                rawNotes: draft.raw_input_text,
                imageUrl: draft.image_url // Make sure you are passing this!
            })
        });
        const newRecipe = await prisma.recipe.create({
            data: {
                restaurant_id: draft.restaurant_id,
                meal_name: `Recipe from Draft #${draft.id}`,
                preparation_notes: draft.raw_input_text || "",
                image_url: draft.image_url || "", // 5. Fixed string | null assignment error
                status: RecipeStatus.PENDING, // 6. Fixed property mismatch (removed _REVIEW)

                // 7. Fixed Prisma relational creation mismatch
                ingredients: {
                    create: validIngredients.map((ing) => ({
                        user_stated_amount: ing.stated_amount,
                        normalized_grams: Number(ing.calculated_grams),
                        ingredient_item: {
                            connect: { id: ing.resolved_ingredient_id as number }
                        }
                    }))
                }
            }
        });

        await prisma.recipeDraft.delete({
            where: { id: draftId }
        });

        revalidatePath("/owner/drafts");
        revalidatePath("/owner/recipes");
        return { success: true, recipeId: newRecipe.id };

    } catch (error: unknown) {
        console.error("Resolution Error:", error);
        return { success: false, message: "Failed to save recipe to database." };
    }
}