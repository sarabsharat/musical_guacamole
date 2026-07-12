import { z } from "zod";

export const ingredientInputSchema = z.object({
    ingredient_id: z.number().int().positive(),
    user_stated_amount: z.string().min(1, "Required"),
    normalized_grams: z.number().positive("Grams must be > 0"),
});

export const confirmDraftSchema = z.object({
    draft_id: z.number().int().positive(),
    meal_name: z.string().min(1, "Meal name required"),
    ingredients: z.array(ingredientInputSchema).min(1, "At least one ingredient"),
});