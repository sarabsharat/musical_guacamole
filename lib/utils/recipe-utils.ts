import { IngredientReference } from "@prisma/client";  // <-- use Prisma type
import { IngredientRow } from "@/lib/shared-types";

export interface LivePreview {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    allergens: Set<string>;
}

export function calculatePreview(rows: IngredientRow[], references: IngredientReference[]): LivePreview {
    let caloriesSum = 0;
    let proteinSum = 0;
    let carbsSum = 0;
    let fatSum = 0;
    const allergensSet = new Set<string>();

    const refMap = new Map(references.map((r) => [r.id, r]));

    for (const row of rows) {
        const ref = refMap.get(row.selectedIngredientId);
        if (ref) {
            const grams = Number(row.normalizedGrams) || 0;
            // Convert Decimal to number safely
            const calPerG = Number(ref.calories_per_g) || 0;
            const proteinPerG = Number(ref.protein_per_g) || 0;
            const carbsPerG = Number(ref.carbs_per_g) || 0;
            const fatPerG = Number(ref.fat_per_g) || 0;

            caloriesSum += calPerG * grams;
            proteinSum += proteinPerG * grams;
            carbsSum += carbsPerG * grams;
            fatSum += fatPerG * grams;

            if (ref.allergens && ref.allergens.length > 0) {
                ref.allergens.forEach((a) => allergensSet.add(a));
            }
        }
    }

    return {
        calories: parseFloat(caloriesSum.toFixed(1)),
        protein: parseFloat(proteinSum.toFixed(1)),
        carbs: parseFloat(carbsSum.toFixed(1)),
        fat: parseFloat(fatSum.toFixed(1)),
        allergens: allergensSet,
    };
}