// actions/jfda.ts
"use server";

import { prisma } from "@/lib/prisma";
import { assertUserAccess, getSession } from "@/lib/security";
import { Role, CertStatus, CertLevel, RecipeStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { serializePrisma } from "@/lib/serialize";

/**
 * Returns a list of restaurants that have cleared Level 2 or Level 3 compliance checks.
 */
export async function getJfdaCertifiedRegistry() {
    const session = await getSession();
    await assertUserAccess(session, [Role.jfda_officer, Role.platform_admin]);

    try {
        const registry = await prisma.restaurant.findMany({
            where: {
                cert_level: { in: [CertLevel.LEVEL_2, CertLevel.LEVEL_3] },
            },
            include: {
                owner: {
                    select: {
                        full_name: true,
                        phone_number: true,
                    },
                },
            },
            orderBy: { business_name: "asc" },
        });

        return {
            success: true,
            message: "Certified registry registry loaded successfully.",
            data: serializePrisma(registry),
        };
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to load JFDA registry." };
    }
}

/**
 * Immediate regulatory revocation of certificate credentials.
 * Demotes the establishment to Level 1 and revokes all active recipes.
 */
export async function revokeRestaurantCompliance(restaurantId: number, reason: string) {
    const session = await getSession();
    await assertUserAccess(session, [Role.jfda_officer, Role.platform_admin]);

    try {
        if (!reason.trim()) {
            return { success: false, message: "A formal regulatory revocation reason is mandatory." };
        }

        await prisma.$transaction(async (tx) => {
            // 1. Demote Restaurant
            await tx.restaurant.update({
                where: { id: restaurantId },
                data: {
                    cert_status: CertStatus.REVOKED,
                    cert_level: CertLevel.LEVEL_1, // Demoted to base state
                },
            });

            // 2. Revoke all active recipes
            await tx.recipe.updateMany({
                where: { restaurant_id: restaurantId },
                data: {
                    status: RecipeStatus.REVOKED,
                    rejection_reason: `JFDA Compliance Enforcement: ${reason}`,
                },
            });

            // 3. Log compliance revocation audit
            await tx.auditLog.create({
                data: {
                    actor_id: session!.id,
                    restaurant_id: restaurantId,
                    action: "REGULATORY_COMPLIANCE_REVOKED",
                    payload: { reason },
                },
            });
        });

        revalidatePath("/jfda/registry");
        return { success: true, message: "Restaurant certification successfully revoked." };
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to execute regulatory revocation." };
    }
}