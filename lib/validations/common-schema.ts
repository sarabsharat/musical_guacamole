import { z } from "zod";

export const ingredientInputSchema = z.object({
    ingredient_id: z.number().int().positive("Ingredient ID must be valid."),
    user_stated_amount: z.string().min(1, "Stated amount is required."),
    normalized_grams: z.number().positive("Weight must be greater than 0."),
});

export type IngredientInput = z.infer<typeof ingredientInputSchema>;