import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

export type ExtractedIngredientDraft = {
    raw_text: string;
    stated_amount: string;
    calculated_grams: number;
};

// 1. We now pass BOTH the text and the imageUrl
export async function parseAndMapUnstructuredInput(
    rawNotes: string,
    imageUrl: string
): Promise<Array<ExtractedIngredientDraft & { resolved_ingredient_id: number | null }>> {

    // Call the new visual extraction pipeline
    const extractedItems = await callGeminiVisualExtraction(rawNotes, imageUrl);

    const resolvedIngredients: Array<ExtractedIngredientDraft & { resolved_ingredient_id: number | null }> = [];

    // Map AI guesses to your database ingredients
    for (const item of extractedItems) {
        const matchedRef = await prisma.ingredientReference.findFirst({
            where: { name: { contains: item.raw_text, mode: "insensitive" } },
        });

        resolvedIngredients.push({
            ...item,
            resolved_ingredient_id: matchedRef ? matchedRef.id : null,
        });
    }

    return resolvedIngredients;
}

async function callGeminiVisualExtraction(text: string, imageUrl: string): Promise<ExtractedIngredientDraft[]> {
    // Fetch the image from the URL and convert to Base64
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = response.headers.get("content-type") || "image/jpeg";

    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    });

    const prompt = `
        You are a Master Chef AI. Your job is to look at the provided image of a meal and read the user's notes, then reverse-engineer the recipe. 
        Notes: "${text}"
        
        Even if the notes are vague (e.g., "Kids meal"), you must visually identify every ingredient in the image and estimate its weight in grams. Include oils, sauces, garnishes, and main components.
        
        Output ONLY a JSON array of objects matching this exact structure:
        [
          {
            "raw_text": "Standard English name of the ingredient (e.g., Chicken Breast, Olive Oil, Basmati Rice)",
            "stated_amount": "Visual estimate (e.g., '1 patty', '1 tbsp', '1 handful')",
            "calculated_grams": Estimated weight in grams as a number (e.g., 150, 15, 30)
          }
        ]
    `;

    try {
        const result = await model.generateContent([
            { text: prompt },
            { inlineData: { mimeType, data: base64Image } }
        ]);
        return JSON.parse(result.response.text()) as ExtractedIngredientDraft[];
    } catch (error) {
        console.error("AI Visual Extraction Failed:", error);
        return []; // Return empty array if it completely fails so the app doesn't crash
    }
}