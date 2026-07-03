// actions/auditor.ts
"use server";
import { prisma } from "@/lib/prisma";
import { assertUserAccess, getSession } from "@/lib/security";
import { Role, RecipeStatus, Prisma, CertLevel, CertStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {SubmitAuditPayload} from "@/lib/shared-types/audit";
import {siteAuditSchema, verifyRecipeSchema} from "@/lib/validations/audit-schema";

/**
 * Retrieves recipes.ts currently waiting for digital verification (Level 1 Queue).
 * Direct database query wrapped securely.
 */
export async function getPendingAuditQueue() {
    const session = await getSession();

    // 🚨 SECURITY: Ensure only authorized auditors or admins can view the queue
    await assertUserAccess(session, [Role.nutritionist_auditor, Role.platform_admin]);

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

        return {
            success: true,
            message: "Pending auditor queue loaded successfully.",
            data: queue,
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load audit queue.";
        return { success: false, message: errorMessage };
    }
}

/**
 * Level 1 Verification Sign-off.
 * Updates recipe status, logs feedback, and preserves an immutable snapshot if approved.
 */
export async function verifyRecipeLevel1(
    recipeId: number,
    approved: boolean,
    rejectionReason?: string
) {
    const session = await getSession();
    await assertUserAccess(session, [Role.nutritionist_auditor, Role.platform_admin]);

    // 🛡️ Zod Validation
    const validated = verifyRecipeSchema.safeParse({ recipeId, approved, rejectionReason });
    if (!validated.success) return { success: false, message: validated.error.issues[0].message };

    try {
        if (!approved && (!rejectionReason || !rejectionReason.trim())) {
            return { success: false, message: "A rejection reason must be logged for declined recipes.ts." };
        }


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
// Add these actions to the bottom of actions/auditor.ts



/**
 * Submits the site audit questionnaire results (Level 2).
 * Automatically upgrades the restaurant to LEVEL_3 if 100% of its recipes.ts are approved.
 */
export async function submitPhysicalSiteAudit(payload: SubmitAuditPayload) {
    const session = await getSession();
    await assertUserAccess(session, [Role.nutritionist_auditor, Role.platform_admin]);

    // 🛡️ Zod Validation
    const validated = siteAuditSchema.safeParse(payload);
    if (!validated.success) return { success: false, message: validated.error.issues[0].message };
    const validData = validated.data;

    try {
        const result = await prisma.$transaction(async (tx) => {
            // Use validData in your transaction block
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

            // 2. Count recipes.ts
            const totalRecipesCount = await tx.recipe.count({
                where: { restaurant_id: validData.restaurantId },
            });

            const unapprovedRecipesCount = await tx.recipe.count({
                where: {
                    restaurant_id: payload.restaurantId,
                    status: { not: RecipeStatus.APPROVED },
                },
            });

            const isFullyCompliant = totalRecipesCount > 0 && unapprovedRecipesCount === 0;

            // 3. Upgrade certification level
            const updatedRestaurant = await tx.restaurant.update({
                where: { id: payload.restaurantId },
                data: {
                    cert_level: isFullyCompliant ? CertLevel.LEVEL_3 : CertLevel.LEVEL_2,
                    cert_status: isFullyCompliant ? CertStatus.ACTIVE : CertStatus.PENDING,
                },
            });

            // 4. Log the audit
            await tx.auditLog.create({
                data: {
                    actor_id: session!.id,
                    restaurant_id: payload.restaurantId,
                    action: "PHYSICAL_SITE_AUDIT_LOGGED",
                    payload: {
                        hasDedicatedAllergenZones: payload.hasDedicatedAllergenZones,
                        usesStandardizedRecipes: payload.usesStandardizedRecipes,
                        assigned_tier: isFullyCompliant ? "LEVEL_3" : "LEVEL_2",
                    } as Prisma.InputJsonValue, // Explicitly cast to prevent type mismatch
                },
            });

            return { profile, restaurant: updatedRestaurant };
        });

        revalidatePath("/auditor/queue");
        revalidatePath(`/auditor/audit/${payload.restaurantId}`);

        return {
            success: true,
            message: result.restaurant.cert_level === CertLevel.LEVEL_3
                ? "Establishment successfully certified as LEVEL 3 (ACTIVE)."
                : "Establishment certified as LEVEL 2. Complete pending digital recipes.ts to unlock Level 3 status.",
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to record physical site audit.";
        return { success: false, message: errorMessage };
    }
}