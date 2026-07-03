import { z } from "zod";
import { ingredientInputSchema } from "./common-schema";

export const submitDraftSchema = z.object({
    raw_text: z.string().min(5, "Raw preparation notes are too short."),
    image_url: z.string().url("Must be a valid URL.").or(z.literal("")),
});

export const confirmDraftSchema = z.object({
    draft_id: z.number().int().positive("Draft ID is required."),
    meal_name: z.string().min(2, "Compliance meal name is required."),
    ingredients: z.array(ingredientInputSchema).min(1, "At least one mapped ingredient is required."),
});

export type SubmitDraftPayload = z.infer<typeof submitDraftSchema>;
export type ConfirmDraftPayload = z.infer<typeof confirmDraftSchema>;