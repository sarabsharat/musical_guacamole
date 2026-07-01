"use server";
import {prisma} from "@/lib/prisma";

export type ExtractedIngredientDraft = {
    raw_text: string;
    stated_amount: string;
    calculated_grams: number;
};

/**
 * Coordinates raw preparation notes, parses them through a MOCK AI,
 * and resolves ingredients against the local database.
 */
export async function parseAndMapUnstructuredInput(
    rawNotes: string
): Promise<Array<ExtractedIngredientDraft & { resolved_ingredient_id: number | null }>> {

    //  Call the mock extraction function
    const extractedItems = await callMockLlmExtractionPipeline(rawNotes);

    const resolvedIngredients: Array<
        ExtractedIngredientDraft & { resolved_ingredient_id: number | null }
    > = [];

    //  Resolve each extraction against the PostgreSQL database
    for (const item of extractedItems) {
        const matchedRef = await prisma.ingredientReference.findFirst({
            where: {
                name: {
                    contains: item.raw_text,
                    mode: "insensitive", // Allows "test" to match "Test"
                },
            },
        });

        resolvedIngredients.push({
            ...item,
            resolved_ingredient_id: matchedRef ? matchedRef.id : null,
        });
    }

    return resolvedIngredients;
}

/**
 * MOCK LLM caller.
 * Returns static data so you can build your UI without needing an API key.
 */
async function callMockLlmExtractionPipeline(text: string): Promise<ExtractedIngredientDraft[]> {
    // Simulating a 1-second delay so you can test your Next.js loading spinners
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return [
        {
            raw_text: "Kmaj Bread",
            stated_amount: "2 loaves",
            calculated_grams: 180,
        },
        {
            raw_text: "Olive Oil",
            stated_amount: "a splash",
            calculated_grams: 15,
        },
    ];
}