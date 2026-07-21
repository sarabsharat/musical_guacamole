import { z } from "zod";

export const submitDraftSchema = z.object({
    raw_text: z.string().min(1, "Raw text is required.").max(5000),
    image_url: z.string().url().optional().nullable(),
});

export const resolveDraftSchema = z.object({
    draftId: z.number().int().positive(),
    finalizedIngredients: z.array(
        z.object({
            resolved_ingredient_id: z.number().int().positive().nullable(),
            stated_amount: z.string().min(1, "Stated amount is required."),
            calculated_grams: z.coerce.number().nonnegative(),
        })
    )
        .min(1, "At least one ingredient is required.")
        .refine(
            (ingredients) => ingredients.some((i) => i.resolved_ingredient_id !== null),
            { message: "At least one ingredient must have a resolved ingredient ID." }
        ),
});

export const deleteDraftSchema = z.object({
    ids: z.union([
        z.number(),
        z.array(z.number()),
        z.array(z.string().transform((val) => parseInt(val, 10)))
    ]).transform((val) => (Array.isArray(val) ? val : [val]))
});