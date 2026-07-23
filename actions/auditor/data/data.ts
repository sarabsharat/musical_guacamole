// actions/auditor/data/data.ts

import { prisma } from "@/lib/prisma";
import { CertLevel, CertStatus, Prisma, RecipeStatus } from "@prisma/client";
import { requireAuditorAuth } from "@/lib/Authentication/RequireAuditorAuth";
import { apiRateLimiter } from "@/lib/RateLimiter/rate-limiter";
import { unstable_cache } from "next/cache";
import { serializePrisma } from "@/lib/serialize";

// ─── Get Pending Audit Queue ──────────────────────────────────
export async function getPendingAuditQueue() {
    const { user, userId, verificationStatus } = await requireAuditorAuth();

    if (verificationStatus !== "VERIFIED") {
        return {
            success: false,
            message: "Account pending verification. Please wait for admin approval."
        };
    }

    try {
        // 1. Preload data and occasional fetching (every 60s)
        const getCachedQueue = unstable_cache(
            async (uid: number) => {
                // 2. The Rate Limiter is INSIDE the cache block.
                // It only consumes a token when the cache expires and the DB is actually hit!
                const { success } = await apiRateLimiter.limit(`auditor-queue-db-${uid}`);
                if (!success) throw new Error("Rate limit exceeded on database query.");

                return await prisma.recipe.findMany({
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
            },
            ["pending-audit-queue"], // Global cache key
            { tags: ["recipes", "queue"], revalidate: 60 } // Fetches new stuff every 60 seconds
        );

        const queue = await getCachedQueue(userId);

        return {
            success: true,
            message: "Pending auditor queue loaded successfully.",
            data: serializePrisma(queue) // Convert Prisma Dates/Decimals to plain objects
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load audit queue.";
        return { success: false, message: errorMessage };
    }
}

// ─── Get Restaurants Needing Physical Audit ──────────────────
export async function getRestaurantsNeedingAudit() {
    const { user, userId, verificationStatus } = await requireAuditorAuth();

    if (verificationStatus !== "VERIFIED") {
        return {
            success: false,
            message: "Account pending verification. Please wait for admin approval."
        };
    }

    try {
        const getCachedRestaurants = unstable_cache(
            async (uid: number) => {
                const { success } = await apiRateLimiter.limit(`auditor-restaurants-db-${uid}`);
                if (!success) throw new Error("Rate limit exceeded on database query.");

                return await prisma.restaurant.findMany({
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
            },
            ["restaurants-needing-audit"],
            { tags: ["restaurants"], revalidate: 60 }
        );

        const restaurants = await getCachedRestaurants(userId);

        return {
            success: true,
            data: serializePrisma(restaurants),
            message: "Restaurants requiring physical site audit retrieved.",
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch restaurants.";
        return { success: false, message: errorMessage };
    }
}

// ─── Get Auditor Metrics ──────────────────────────────────────
export async function getAuditorMetrics() {
    const { user, userId, verificationStatus } = await requireAuditorAuth();

    if (verificationStatus !== "VERIFIED") {
        return {
            success: false,
            message: "Account pending verification. Please wait for admin approval."
        };
    }

    try {
        const getCachedMetrics = unstable_cache(
            async (uid: number) => {
                const { success } = await apiRateLimiter.limit(`auditor-metrics-db-${uid}`);
                if (!success) throw new Error("Rate limit exceeded on database query.");

                const reviewsDone = await prisma.auditLog.count({
                    where: {
                        actor_id: uid,
                        action: { in: ["RECIPE_APPROVED", "RECIPE_REJECTED"] },
                    },
                });

                const pending = await prisma.recipe.count({
                    where: { status: RecipeStatus.PENDING },
                });

                const approved = await prisma.auditLog.count({
                    where: {
                        actor_id: uid,
                        action: "RECIPE_APPROVED",
                    },
                });

                const rejected = await prisma.auditLog.count({
                    where: {
                        actor_id: uid,
                        action: "RECIPE_REJECTED",
                    },
                });

                const approvalRate = reviewsDone > 0 ? (approved / reviewsDone) * 100 : 0;

                return {
                    reviewsDone: Number(reviewsDone) || 0,
                    pending: Number(pending) || 0,
                    approved: Number(approved) || 0,
                    rejected: Number(rejected) || 0,
                    approvalRate: Math.round(approvalRate * 100) / 100 || 0,
                };
            },
            [`auditor-metrics-${userId}`], // User specific cache key
            { tags: [`metrics-${userId}`], revalidate: 60 }
        );

        const metricsData = await getCachedMetrics(userId);

        return {
            success: true,
            data: serializePrisma(metricsData),
            message: "Auditor metrics retrieved.",
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to compute metrics.";
        return { success: false, message: errorMessage };
    }
}

// ─── Generate Audit Report (Dynamic, Not Cached) ──────────────
// Because reports depend on dynamic dates/payloads, we leave the rate limiter outside
// to prevent abuse without caching the results globally.
export async function generateAuditReport(payload: unknown) {
    const { user, userId, verificationStatus } = await requireAuditorAuth();

    if (verificationStatus !== "VERIFIED") {
        return {
            success: false,
            message: "Account pending verification. Please wait for admin approval."
        };
    }

    const { success } = await apiRateLimiter.limit(`auditor-report-${userId}`);
    if (!success) {
        return {
            success: false,
            message: "Rate limit exceeded. Please wait a moment."
        };
    }

    const { auditReportSchema } = await import("@/lib/validations/audit-schema");
    const validated = auditReportSchema.safeParse(payload);
    if (!validated.success) {
        return { success: false, message: validated.error.issues[0].message };
    }

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

        const serialized = serializePrisma(filteredLogs);
        return {
            success: true,
            data: serialized,
            message: `Audit report generated with ${filteredLogs.length} entries.`,
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to generate audit report.";
        return { success: false, message: errorMessage };
    }
}