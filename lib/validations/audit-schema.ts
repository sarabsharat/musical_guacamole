import { z } from "zod";

export const verifyRecipeSchema = z.object({
    recipeId: z.number().int().positive(),
    approved: z.boolean(),
    rejectionReason: z.string().optional(),
}).refine(data => data.approved || (data.rejectionReason && data.rejectionReason.trim().length > 0), {
    message: "A rejection reason must be logged for declined recipes.",
    path: ["rejectionReason"],
});

export const siteAuditSchema = z.object({
    restaurantId: z.number().int().positive(),
    hasDedicatedAllergenZones: z.boolean(),
    usesStandardizedRecipes: z.boolean(),
});

export type VerifyRecipePayload = z.infer<typeof verifyRecipeSchema>;
export type SubmitAuditPayload = z.infer<typeof siteAuditSchema>;