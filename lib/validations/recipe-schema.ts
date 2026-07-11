// lib/validations/recipe-schema.ts
import { z } from "zod";
import { ingredientInputSchema } from "./common-schema";

export const updateRecipeSchema = z.object({
    meal_name: z.string().min(2, "Meal name is required."),
    preparation_notes: z.string().min(5, "Preparation notes are required."),
    image_url: z.string().url().or(z.literal("")),
    ingredients: z.array(ingredientInputSchema).min(1, "At least one ingredient is required."),
});

// Reuse the same shape for creating a new recipe (no recipeId needed)
export const createManualRecipeSchema = updateRecipeSchema;

export type UpdateRecipePayload = z.infer<typeof updateRecipeSchema>;
export type CreateManualRecipePayload = z.infer<typeof createManualRecipeSchema>;