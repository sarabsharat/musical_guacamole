// actions/AuditorActions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { CertLevel, CertStatus, Prisma, RecipeStatus, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
    auditReportSchema,
    clarificationSchema,
    siteAuditSchema,
    verifyRecipeSchema,
} from "@/lib/validations/audit-schema";
import { z } from "zod";
import { requireAuditorAuth } from "@/lib/Authentication/RequireAuditorAuth";
import {apiRateLimiter, uploadRateLimiter} from "@/lib/RateLimiter/rate-limiter";
import {getPresignedUploadUrl} from "@/lib/s3-service";



// ────────────────────────────────────────────────────────────────
// ─── Get Certificate ──────────────────────────────────
// ────────────────────────────────────────────────────────────────
const certUploadSchema = z.object({
    fileName: z.string().min(1),
    fileType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
    fileSize: z.number().int().positive().max(5 * 1024 * 1024), // 5MB limit
});

export async function getCertificationUploadUrl(input: z.infer<typeof certUploadSchema>) {
    const { userId } = await requireAuditorAuth();

    const { success: rateLimitSuccess } = await uploadRateLimiter.limit(`upload_cert_${userId}`);
    if (!rateLimitSuccess) return { success: false, message: "Rate limit exceeded." };

    const validated = certUploadSchema.safeParse(input);
    if (!validated.success) return { success: false, message: "Invalid file data." };

    const { fileName, fileType, fileSize } = validated.data;
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileKey = `certifications/${userId}/${Date.now()}-${sanitizedFileName}`;

    const result = await getPresignedUploadUrl({ fileKey, fileType, fileSize });

    if (!result.uploadUrl) return { success: false, message: "Failed to generate URL." };

    return {
        success: true,
        uploadUrl: result.uploadUrl,
        fileKey: result.fileKey || fileKey,
    };
}

// LOGIC: Links the uploaded document to the user and updates status
export async function submitCertificationDoc(fileKey: string) {
    const { userId } = await requireAuditorAuth();

    const { success: rateLimitSuccess } = await apiRateLimiter.limit(`submit_cert_${userId}`);
    if (!rateLimitSuccess) return { success: false, message: "Rate limit exceeded." };

    try {
        await prisma.user.update({
            where: { id: userId },
            data: {
                certification_url: fileKey,
                verification_status: "PENDING"
            }
        });

        revalidatePath("/onboarding");
        return { success: true, message: "Certification submitted successfully." };
    } catch (error) {
        console.error("Submission error:", error);
        return { success: false, message: "Failed to save certification record." };
    }
}


// ────────────────────────────────────────────────────────────────
// ─── Get Pending Audit Queue ──────────────────────────────────
// ────────────────────────────────────────────────────────────────
export async function getPendingAuditQueue() {
    const { user, userId } = await requireAuditorAuth();

    const { success } = await apiRateLimiter.limit(`auditor-queue-${user.id}`);
    if (!success) {
        return { success: false, message: "Rate limit exceeded. Please wait a moment." };
    }

    try {
        const queue = await prisma.recipe.findMany({
            where: { status: RecipeStatus.PENDING },
            include: {
                restaurant: {
                    select: {
                        id: true,
                        business_name: true,
                        cert_level: true,
                        slug: true,
                    },
                },
                ingredients: {
                    include: {
                        ingredient_item: {
                            select: {
                                name: true,
                                calories_per_g: true,
                                allergens: true,
                            },
                        },
                    },
                },
            },
            orderBy: { id: "asc" },
        });

        return { success: true, message: "Pending auditor queue loaded successfully.", data: queue };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load audit queue.";
        return { success: false, message: errorMessage };
    }
}

// ────────────────────────────────────────────────────────────────
// ─── Verify Recipe Level 1 ────────────────────────────────────
// ────────────────────────────────────────────────────────────────
export async function verifyRecipeLevel1(payload: unknown) {
    const { user, userId } = await requireAuditorAuth();

    const { success } = await apiRateLimiter.limit(`auditor-verify-${user.id}`);
    if (!success) {
        return { success: false, message: "Rate limit exceeded. Please wait a moment." };
    }

    const validated = verifyRecipeSchema.safeParse(payload);
    if (!validated.success) return { success: false, message: validated.error.issues[0].message };
    const { recipeId, approved, rejectionReason } = validated.data;

    try {
        const recipe = await prisma.recipe.findUnique({
            where: { id: recipeId },
            include: { ingredients: { include: { ingredient_item: true } } },
        });
        if (!recipe) return { success: false, message: "Recipe not found." };

        if (recipe.status !== RecipeStatus.PENDING) {
            return { success: false, message: `Recipe is already ${recipe.status}.` };
        }

        const newStatus = approved ? RecipeStatus.APPROVED : RecipeStatus.REJECTED;

        await prisma.$transaction(async (tx) => {
            await tx.recipe.update({
                where: { id: recipeId },
                data: {
                    status: newStatus,
                    rejection_reason: approved ? null : (rejectionReason || null),
                },
            });

            if (approved) {
                await tx.recipeVersion.create({
                    data: {
                        recipe_id: recipeId,
                        snapshot: {
                            meal_name: recipe.meal_name,
                            image_url: recipe.image_url,
                            preparation_notes: recipe.preparation_notes,
                            calories: recipe.calories.toString(),
                            protein: recipe.protein.toString(),
                            carbs: recipe.carbs.toString(),
                            total_fat: recipe.total_fat.toString(),
                            detected_allergens: recipe.detected_allergens,
                            ingredients: recipe.ingredients.map((ing) => ({
                                ingredient_id: ing.ingredient_id,
                                name: ing.ingredient_item.name,
                                user_stated_amount: ing.user_stated_amount,
                                normalized_grams: ing.normalized_grams.toString(),
                            })),
                        },
                    },
                });
            }

            await tx.auditLog.create({
                data: {
                    actor_id: userId, // 👈 number
                    restaurant_id: recipe.restaurant_id,
                    recipe_id: recipeId,
                    action: approved ? "RECIPE_APPROVED" : "RECIPE_REJECTED",
                    payload: {
                        approved,
                        rejectionReason: rejectionReason || null,
                    } as Prisma.InputJsonValue,
                },
            });
        });

        revalidatePath("/auditor/queue");
        revalidatePath(`/auditor/queue/${recipeId}`);
        revalidatePath("/owner/recipes");

        return {
            success: true,
            message: approved
                ? "Recipe successfully certified for Level 1 compliance."
                : "Recipe rejected. Notification feedback logged for restaurant owner.",
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to execute digital verification.";
        return { success: false, message: errorMessage };
    }
}

// ────────────────────────────────────────────────────────────────
// ─── Submit Physical Site Audit (Level 2) ────────────────────
// ────────────────────────────────────────────────────────────────
export async function submitPhysicalSiteAudit(payload: unknown) {
    const { user, userId } = await requireAuditorAuth();

    const { success } = await uploadRateLimiter.limit(`auditor-site-${user.id}`);
    if (!success) {
        return { success: false, message: "Rate limit exceeded. Please wait a moment." };
    }

    const validated = siteAuditSchema.safeParse(payload);
    if (!validated.success) return { success: false, message: validated.error.issues[0].message };
    const validData = validated.data;

    try {
        const result = await prisma.$transaction(async (tx) => {
            const profile = await tx.kitchenControlProfile.upsert({
                where: { restaurantId: validData.restaurantId },
                update: {
                    hasDedicatedAllergenZones: validData.hasDedicatedAllergenZones,
                    usesStandardizedRecipes: validData.usesStandardizedRecipes,
                },
                create: {
                    restaurantId: validData.restaurantId,
                    hasDedicatedAllergenZones: validData.hasDedicatedAllergenZones,
                    usesStandardizedRecipes: validData.usesStandardizedRecipes,
                },
            });

            const totalRecipesCount = await tx.recipe.count({
                where: { restaurant_id: validData.restaurantId },
            });
            const unapprovedRecipesCount = await tx.recipe.count({
                where: {
                    restaurant_id: validData.restaurantId,
                    status: { not: RecipeStatus.APPROVED },
                },
            });

            const isFullyCompliant = totalRecipesCount > 0 && unapprovedRecipesCount === 0;

            const updatedRestaurant = await tx.restaurant.update({
                where: { id: validData.restaurantId },
                data: {
                    cert_level: isFullyCompliant ? CertLevel.LEVEL_3 : CertLevel.LEVEL_2,
                    cert_status: isFullyCompliant ? CertStatus.ACTIVE : CertStatus.PENDING,
                },
            });

            await tx.auditLog.create({
                data: {
                    actor_id: userId,
                    restaurant_id: validData.restaurantId,
                    action: "PHYSICAL_SITE_AUDIT_LOGGED",
                    payload: {
                        hasDedicatedAllergenZones: validData.hasDedicatedAllergenZones,
                        usesStandardizedRecipes: validData.usesStandardizedRecipes,
                        assigned_tier: isFullyCompliant ? "LEVEL_3" : "LEVEL_2",
                    } as Prisma.InputJsonValue,
                },
            });

            return { profile, restaurant: updatedRestaurant };
        });

        revalidatePath("/auditor/queue");
        revalidatePath(`/auditor/audit/${validData.restaurantId}`);

        return {
            success: true,
            message: result.restaurant.cert_level === CertLevel.LEVEL_3
                ? "Establishment successfully certified as LEVEL 3 (ACTIVE)."
                : "Establishment certified as LEVEL 2. Complete pending recipes to unlock Level 3 status.",
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to record physical site audit.";
        return { success: false, message: errorMessage };
    }
}

// ────────────────────────────────────────────────────────────────
// ─── Request Clarification from Owner ────────────────────────
// ────────────────────────────────────────────────────────────────
export async function requestClarification(payload: unknown) {
    const { user, userId } = await requireAuditorAuth();

    const { success } = await apiRateLimiter.limit(`auditor-clarify-${user.id}`);
    if (!success) {
        return { success: false, message: "Rate limit exceeded. Please wait a moment." };
    }

    const validated = clarificationSchema.safeParse(payload);
    if (!validated.success) return { success: false, message: validated.error.issues[0].message };
    const { recipeId, message } = validated.data;

    try {
        const recipe = await prisma.recipe.findUnique({
            where: { id: recipeId },
            select: { restaurant_id: true, status: true },
        });
        if (!recipe) return { success: false, message: "Recipe not found." };
        if (recipe.status !== RecipeStatus.PENDING) {
            return { success: false, message: "Only pending recipes can be clarified." };
        }

        await prisma.auditLog.create({
            data: {
                actor_id: userId,
                restaurant_id: recipe.restaurant_id,
                recipe_id: recipeId,
                action: "CLARIFICATION_REQUESTED",
                payload: { message } as Prisma.InputJsonValue,
            },
        });

        return { success: true, message: "Clarification request sent to restaurant owner." };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to request clarification.";
        return { success: false, message: errorMessage };
    }
}

// ────────────────────────────────────────────────────────────────
// ─── Get Restaurants Needing Physical Audit ──────────────────
// ────────────────────────────────────────────────────────────────
export async function getRestaurantsNeedingAudit() {
    const { user } = await requireAuditorAuth();

    const { success } = await apiRateLimiter.limit(`auditor-restaurants-${user.id}`);
    if (!success) {
        return { success: false, message: "Rate limit exceeded. Please wait a moment." };
    }

    try {
        const restaurants = await prisma.restaurant.findMany({
            where: {
                cert_level: { in: [CertLevel.LEVEL_1, CertLevel.LEVEL_2] },
                recipes: { some: { status: RecipeStatus.APPROVED } },
            },
            select: {
                id: true,
                business_name: true,
                slug: true,
                cert_level: true,
                cert_status: true,
                _count: {
                    select: { recipes: { where: { status: RecipeStatus.APPROVED } } },
                },
            },
        });

        return {
            success: true,
            data: restaurants,
            message: "Restaurants requiring physical site audit retrieved.",
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch restaurants.";
        return { success: false, message: errorMessage };
    }
}

// ────────────────────────────────────────────────────────────────
// ─── Get Auditor Metrics ──────────────────────────────────────
// ────────────────────────────────────────────────────────────────
export async function getAuditorMetrics() {
    const { user, userId } = await requireAuditorAuth();
    console.log(`[getAuditorMetrics] called at ${new Date().toISOString()}`);

    const { success } = await apiRateLimiter.limit(`auditor-metrics-${user.id}`);
    if (!success) {
        return { success: false, message: "Rate limit exceeded. Please wait a moment." };
    }

    try {
        const reviewsDone = await prisma.auditLog.count({
            where: {
                actor_id: userId,
                action: { in: ["RECIPE_APPROVED", "RECIPE_REJECTED"] },
            },
        });

        const pending = await prisma.recipe.count({
            where: { status: RecipeStatus.PENDING },
        });

        const approved = await prisma.auditLog.count({
            where: {
                actor_id: userId,
                action: "RECIPE_APPROVED",
            },
        });

        const rejected = await prisma.auditLog.count({
            where: {
                actor_id: userId,
                action: "RECIPE_REJECTED",
            },
        });

        const approvalRate = reviewsDone > 0 ? (approved / reviewsDone) * 100 : 0;

        return {
            success: true,
            data: {
                reviewsDone,
                pending,
                approved,
                rejected,
                approvalRate: Math.round(approvalRate * 100) / 100,
            },
            message: "Auditor metrics retrieved.",
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to compute metrics.";
        return { success: false, message: errorMessage };
    }
}

// ────────────────────────────────────────────────────────────────
// ─── Generate Audit Report ────────────────────────────────────
// ────────────────────────────────────────────────────────────────
export async function generateAuditReport(payload: unknown) {
    const { user } = await requireAuditorAuth();

    const { success } = await apiRateLimiter.limit(`auditor-report-${user.id}`);
    if (!success) {
        return { success: false, message: "Rate limit exceeded. Please wait a moment." };
    }

    const validated = auditReportSchema.safeParse(payload);
    if (!validated.success) return { success: false, message: validated.error.issues[0].message };
    const { startDate, endDate, restaurantId, allergen } = validated.data;

    try {
        const whereClause: Prisma.AuditLogWhereInput = {
            action: { in: ["RECIPE_APPROVED", "RECIPE_REJECTED", "PHYSICAL_SITE_AUDIT_LOGGED"] },
            ...(startDate && { created_at: { gte: new Date(startDate) } }),
            ...(endDate && { created_at: { lte: new Date(endDate) } }),
            ...(restaurantId && { restaurant_id: restaurantId }),
        };

        const logs = await prisma.auditLog.findMany({
            where: whereClause,
            select: {
                id: true,
                action: true,
                payload: true,
                created_at: true,
                actor_id: true,
                restaurant_id: true,
                actor: {
                    select: { full_name: true, email: true },
                },
                restaurant: {
                    select: { business_name: true },
                },
            },
            orderBy: { created_at: "desc" },
        });

        let filteredLogs = logs;
        if (allergen) {
            filteredLogs = logs.filter((log) => {
                const logPayload = log.payload as Record<string, unknown>;
                const detectedAllergens = logPayload?.detected_allergens as string[] | undefined;
                return detectedAllergens?.includes(allergen) || logPayload?.allergen === allergen;
            });
        }

        return {
            success: true,
            data: filteredLogs,
            message: `Audit report generated with ${filteredLogs.length} entries. (CSV/PDF export not implemented – returning JSON)`,
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to generate audit report.";
        return { success: false, message: errorMessage };
    }
}

// ────────────────────────────────────────────────────────────────
// ─── Create Audit Version Manually ────────────────────────────
// ────────────────────────────────────────────────────────────────
export async function createAuditVersion(payload: unknown) {
    const { user, userId } = await requireAuditorAuth();

    const { success } = await apiRateLimiter.limit(`auditor-version-${user.id}`);
    if (!success) {
        return { success: false, message: "Rate limit exceeded. Please wait a moment." };
    }

    const schema = z.object({ recipeId: z.number().int().positive() });
    const validated = schema.safeParse(payload);
    if (!validated.success) return { success: false, message: validated.error.issues[0].message };
    const { recipeId } = validated.data;

    try {
        const recipe = await prisma.recipe.findUnique({
            where: { id: recipeId },
            include: { ingredients: { include: { ingredient_item: true } } },
        });
        if (!recipe) return { success: false, message: "Recipe not found." };

        await prisma.recipeVersion.create({
            data: {
                recipe_id: recipeId,
                snapshot: {
                    meal_name: recipe.meal_name,
                    image_url: recipe.image_url,
                    preparation_notes: recipe.preparation_notes,
                    calories: recipe.calories.toString(),
                    protein: recipe.protein.toString(),
                    carbs: recipe.carbs.toString(),
                    total_fat: recipe.total_fat.toString(),
                    detected_allergens: recipe.detected_allergens,
                    ingredients: recipe.ingredients.map((ing) => ({
                        ingredient_id: ing.ingredient_id,
                        name: ing.ingredient_item.name,
                        user_stated_amount: ing.user_stated_amount,
                        normalized_grams: ing.normalized_grams.toString(),
                    })),
                },
            },
        });

        await prisma.auditLog.create({
            data: {
                actor_id: userId,
                restaurant_id: recipe.restaurant_id,
                recipe_id: recipeId,
                action: "MANUAL_SNAPSHOT_CREATED",
                payload: { note: "Manual snapshot created by auditor." } as Prisma.InputJsonValue,
            },
        });

        revalidatePath(`/auditor/queue/${recipeId}`);
        return { success: true, message: "Manual snapshot created successfully." };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to create manual snapshot.";
        return { success: false, message: errorMessage };
    }
}