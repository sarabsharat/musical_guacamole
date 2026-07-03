// actions/jfda.ts
"use server";

import { prisma } from "@/lib/prisma";
import { assertUserAccess, getSession } from "@/lib/security";
import { Role, CertStatus, CertLevel, RecipeStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { serializePrisma } from "@/lib/serialize";
import {revokeSchema} from "@/lib/validations/jfda-schema";

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
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load JFDA registry.";
        return { success: false, message };
    }
}

/**
 * Immediate regulatory revocation of certificate credentials.
 * Demotes the establishment to Level 1 and revokes all active recipes.ts.
 */
export async function revokeRestaurantCompliance(restaurantId: number, reason: string) {
    const session = await getSession();
    await assertUserAccess(session, [Role.jfda_officer, Role.platform_admin]);

    // 🛡️ Zod Validation
    const validated = revokeSchema.safeParse({ restaurantId, reason });
    if (!validated.success) return { success: false, message: validated.error.issues[0].message };

    try {
        const restaurant = await prisma.restaurant.findUnique({
            where: { id: restaurantId },
            select: { cert_status: true },
        });

        if (!restaurant) return { success: false, message: "Restaurant not found." };
        if (restaurant.cert_status === CertStatus.REVOKED) {
            return { success: false, message: "This establishment is already revoked." };
        }

        await prisma.$transaction(async (tx) => {
            await tx.restaurant.update({
                where: { id: restaurantId },
                data: { cert_status: CertStatus.REVOKED, cert_level: CertLevel.LEVEL_1 },
            });

            await tx.recipe.updateMany({
                where: { restaurant_id: restaurantId },
                data: {
                    status: RecipeStatus.REVOKED,
                    rejection_reason: `JFDA Compliance Enforcement: ${validated.data.reason}`,
                },
            });

            await tx.auditLog.create({
                data: {
                    actor_id: session!.id,
                    restaurant_id: restaurantId,
                    action: "REGULATORY_COMPLIANCE_REVOKED",
                    payload: { reason: validated.data.reason },
                },
            });
        });

        revalidatePath("/jfda/registry");
        return { success: true, message: "Restaurant certification successfully revoked." };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load JFDA registry.";
        return { success: false, message };
    }
}