import { Prisma, IngredientReference } from "@prisma/client";

export function calculateServerRecipeTotals(
    payloadIngredients: Array<{ ingredient_id: number; normalized_grams: number }>,
    references: IngredientReference[]
) {
    let totalCalories = new Prisma.Decimal(0);
    let totalProtein = new Prisma.Decimal(0);
    let totalCarbs = new Prisma.Decimal(0);
    let totalFat = new Prisma.Decimal(0);
    const aggregatedAllergens = new Set<string>();

    const refMap = new Map(references.map((r) => [r.id, r]));

    for (const rawIng of payloadIngredients) {
        const ref = refMap.get(rawIng.ingredient_id);
        if (!ref) throw new Error(`Missing ingredient record: ${rawIng.ingredient_id}`);

        const grams = new Prisma.Decimal(rawIng.normalized_grams);
        totalCalories = totalCalories.add(ref.calories_per_g.mul(grams));
        totalProtein = totalProtein.add(ref.protein_per_g.mul(grams));
        totalCarbs = totalCarbs.add(ref.carbs_per_g.mul(grams));
        totalFat = totalFat.add(ref.fat_per_g.mul(grams));

        if (ref.allergens && Array.isArray(ref.allergens)) {
            ref.allergens.forEach((allergen: string) => {
                aggregatedAllergens.add(allergen);
            });
        }
    }

    return {
        calories: totalCalories,
        protein: totalProtein,
        carbs: totalCarbs,
        total_fat: totalFat,
        detected_allergens: Array.from(aggregatedAllergens),
    };
}