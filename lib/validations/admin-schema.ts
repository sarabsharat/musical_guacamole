import { z } from "zod";
import { CertLevel, CertStatus, Role, RecipeStatus } from "@prisma/client";

export const adminForceCertSchema = z.object({
    restaurantId: z.number().int().positive(),
    level: z.nativeEnum(CertLevel),
    status: z.nativeEnum(CertStatus),
    adminReason: z.string().min(5, "Must provide a reason for the audit log."),
});

export const adminUserSchema = z.object({
    email: z.string().email(),
    full_name: z.string().min(2),
    role: z.nativeEnum(Role),
    password: z.string().min(8, "Password must be at least 8 characters"),
    phone_number: z.string().min(1, "Phone number is required."), // or optional with default
});

export const adminRecipeOverrideSchema = z.object({
    recipeId: z.number().int().positive(),
    status: z.nativeEnum(RecipeStatus),
    adminReason: z.string().min(5),
});

export const adminUpdateUserSchema = z.object({
    userId: z.number().int().positive(),
    newRole:z.nativeEnum(Role),
    adminReason: z.string().min(5, "Reason for the audit log."),
});

export const adminToggleUserStatusSchema = z.object({
    userId: z.number().int().positive(),
    isActive:z.boolean(),
    adminReason: z.string().min(5, "Reason for the audit log."),
})

export const adminResetPasswordSchema = z.object({
    userId: z.number().int().positive(),
    sendEmail: z.boolean().optional().default(true),
});

export const adminDeleteRestaurantSchema = z.object({
    restaurantId: z.number().int().positive(),
})

export const adminResetKitchenProfileSchema = z.object({
    restaurantId: z.number().int().positive(),
})

export const adminBulkApproveRecipeSchema = z.object({
    recipeIds: z.array(z.number().int().positive()).min(1,"At least one recipe must be selected for bulk approval."),
})

export const adminDeleteRecipeSchema = z.object({
    recipeId: z.number().int().positive(),
})

export const adminEditRecipeSchema = z.object({
    recipeId: z.number().int().positive(),
    recipeData: z.object({
        meal_name: z.string().min(1).optional(),
        image_url: z.string().url().optional(),
        preparation_notes: z.string().optional(),
        calories: z.number().nonnegative().optional(),
        protein: z.number().nonnegative().optional(),
        carbs: z.number().nonnegative().optional(),
        total_fat: z.number().nonnegative().optional(),
        detected_allergens: z.array(z.string()).optional(),
    }).strict(),
})

export const adminCreateIngredientRefSchema = z.object({
    name: z.string().min(1,"Name is required"),
    macros: z.object({
        protein: z.number().nonnegative(),
        carbs: z.number().nonnegative(),
        fat: z.number().nonnegative(),
        calories: z.number().nonnegative(),
    }),
    allergens: z.array(z.string()).optional(),
});

export const adminUpdateIngredientRefSchema = z.object({
    id: z.number().int().positive(),
    data: adminCreateIngredientRefSchema.shape.macros.partial().extend({
        name: z.string().min(1).optional(),
        allergens: z.array(z.string()).optional(),
    }),
});

export const adminDeleteAuditLogSchema = z.object({
    logId: z.number().int().positive(),
});