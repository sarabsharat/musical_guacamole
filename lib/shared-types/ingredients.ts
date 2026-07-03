// Only our custom UI types – we'll use Prisma's IngredientReference for the component props
export interface IngredientRow {
    keyId: string;
    rawText: string;
    userStatedAmount: string;
    normalizedGrams: number;
    selectedIngredientId: number;
}