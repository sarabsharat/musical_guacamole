// lib/validations/audit-schema.ts
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

// New schemas for missing actions
export const clarificationSchema = z.object({
    recipeId: z.number().int().positive(),
    message: z.string().min(10, "Clarification request must be at least 10 characters."),
});

export const auditReportSchema = z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    restaurantId: z.number().int().positive().optional(),
    allergen: z.string().optional(),
});

export type VerifyRecipePayload = z.infer<typeof verifyRecipeSchema>;
export type SubmitAuditPayload = z.infer<typeof siteAuditSchema>;
export type ClarificationPayload = z.infer<typeof clarificationSchema>;
export type AuditReportPayload = z.infer<typeof auditReportSchema>;