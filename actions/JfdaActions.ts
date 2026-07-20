// actions/JfdaActions.ts - UPGRADED: 3-Layer Security Protocol
"use server";

import { prisma } from "@/lib/prisma";
import { CertStatus, CertLevel, RecipeStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { serializePrisma } from "@/lib/serialize";
import { revokeSchema } from "@/lib/validations/jfda-schema";
import { z } from "zod";
import {requireJfdaAuth} from "@/lib/Authentication/RequireJfdaAuth";

// ═══════════════════════════════════════════════════════════════
// GET JFDA CERTIFIED REGISTRY - List all certified restaurants
// ═══════════════════════════════════════════════════════════════

export async function getJfdaCertifiedRegistry(_mockUser: unknown) {
    try {
        // ═════════════════════════════════════════════════════════════════
        // LAYER 1: AUTH WALL - Verify JFDA officer authentication
        // ═════════════════════════════════════════════════════════════════
        const { userId } = await requireJfdaAuth();

        console.log("📋 [JfdaAction] Fetching certified registry for officer:", userId);

        // ═════════════════════════════════════════════════════════════════
        // LAYER 3: NO TENANT ISOLATION - JFDA officers see all restaurants
        // ═════════════════════════════════════════════════════════════════

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

        console.log("✅ [JfdaAction] Certified registry loaded successfully:", registry.length);

        return {
            success: true,
            message: "Certified registry loaded successfully.",
            data: serializePrisma(registry),
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load JFDA registry.";
        console.error("❌ [JfdaAction] Error:", message);
        return { success: false, message };
    }
}

// ═══════════════════════════════════════════════════════════════
// REVOKE RESTAURANT COMPLIANCE - Immediate regulatory revocation
// ═══════════════════════════════════════════════════════════════

export async function revokeRestaurantCompliance(
    _mockUser: unknown,
    input: unknown
) {
    try {
        // ═════════════════════════════════════════════════════════════════
        // LAYER 1: AUTH WALL - Verify JFDA officer authentication
        // ═════════════════════════════════════════════════════════════════
        const { userId } = await requireJfdaAuth();

        console.log(
            "🚫 [JfdaAction] Revoking restaurant compliance. Officer:",
            userId
        );

        // ═════════════════════════════════════════════════════════════════
        // LAYER 2: ZOD VALIDATION - Validate input
        // ═════════════════════════════════════════════════════════════════
        const validated = revokeSchema.safeParse(input);
        if (!validated.success) {
            console.log("❌ [JfdaAction] Validation failed:", validated.error.issues);
            return {
                success: false,
                message: validated.error.issues[0]?.message || "Validation failed",
            };
        }

        const { restaurantId, reason } = validated.data;

        // ═════════════════════════════════════════════════════════════════
        // LAYER 3: NO TENANT ISOLATION - JFDA can revoke any restaurant
        // ═════════════════════════════════════════════════════════════════

        const restaurant = await prisma.restaurant.findUnique({
            where: { id: restaurantId },
            select: { cert_status: true, business_name: true },
        });

        if (!restaurant) {
            console.log("❌ [JfdaAction] Restaurant not found:", restaurantId);
            return { success: false, message: "Restaurant not found." };
        }

        if (restaurant.cert_status === CertStatus.REVOKED) {
            console.log("❌ [JfdaAction] Restaurant already revoked:", restaurantId);
            return { success: false, message: "This establishment is already revoked." };
        }

        // Transaction: Update restaurant + all recipes + audit log
        await prisma.$transaction(async (tx) => {
            await tx.restaurant.update({
                where: { id: restaurantId },
                data: { cert_status: CertStatus.REVOKED, cert_level: CertLevel.LEVEL_1 },
            });

            await tx.recipe.updateMany({
                where: { restaurant_id: restaurantId },
                data: {
                    status: RecipeStatus.REVOKED,
                    rejection_reason: `JFDA Compliance Enforcement: ${reason}`,
                },
            });

            await tx.auditLog.create({
                data: {
                    actor_id: Number(userId),
                    restaurant_id: restaurantId,
                    action: "REGULATORY_COMPLIANCE_REVOKED",
                    payload: { reason },
                },
            });
        });

        console.log(
            "✅ [JfdaAction] Restaurant compliance revoked:",
            restaurantId,
            "Reason:",
            reason
        );

        revalidatePath("/jfda/registry");

        return { success: true, message: "Restaurant certification successfully revoked." };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to revoke compliance.";
        console.error("❌ [JfdaAction] Error:", message);
        return { success: false, message };
    }
}
// ═══════════════════════════════════════════════════════════════
// CERTIFY RECIPE APPLICATION - JFDA Approval
// ═══════════════════════════════════════════════════════════════

// Define this schema at the top of your file or in your validations folder
const certifySchema = z.object({
    recipeId: z.number(),
    restaurantId: z.number(),
});

export async function certifyRecipeApplication(
    _mockUser: unknown,
    input: unknown
) {
    try {
        // ═════════════════════════════════════════════════════════════════
        // LAYER 1: AUTH WALL - Verify JFDA officer authentication
        // ═════════════════════════════════════════════════════════════════
        const { userId } = await requireJfdaAuth();

        console.log("✅ [JfdaAction] Certifying recipe application. Officer:", userId);

        // ═════════════════════════════════════════════════════════════════
        // LAYER 2: ZOD VALIDATION - Validate input
        // ═════════════════════════════════════════════════════════════════
        const validated = certifySchema.safeParse(input);
        if (!validated.success) {
            console.log("❌ [JfdaAction] Validation failed:", validated.error.issues);
            return {
                success: false,
                message: validated.error.issues[0]?.message || "Validation failed",
            };
        }

        const { recipeId, restaurantId } = validated.data;

        // ═════════════════════════════════════════════════════════════════
        // LAYER 3: NO TENANT ISOLATION - JFDA can certify any recipe
        // ═════════════════════════════════════════════════════════════════

        const recipe = await prisma.recipe.findUnique({
            where: { id: recipeId },
        });

        if (!recipe) {
            return { success: false, message: "Application/Recipe not found." };
        }

        if (recipe.status === RecipeStatus.APPROVED) {
            return { success: false, message: "This recipe is already certified." };
        }

        // Transaction: Update recipe status and log the action
        await prisma.$transaction(async (tx) => {
            await tx.recipe.update({
                where: { id: recipeId },
                data: {
                    status: RecipeStatus.APPROVED,
                    rejection_reason: null, // Clear any previous rejection reasons
                },
            });

            // Automatically upgrade the restaurant's cert level if needed here (optional logic)

            await tx.auditLog.create({
                data: {
                    actor_id: Number(userId),
                    restaurant_id: restaurantId,
                    action: "REGULATORY_COMPLIANCE_APPROVED",
                    payload: { recipeId },
                },
            });
        });

        console.log("✅ [JfdaAction] Recipe successfully certified:", recipeId);

        revalidatePath("/jfda/dashboard");

        return { success: true, message: "Application successfully certified." };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to certify application.";
        console.error("❌ [JfdaAction] Error:", message);
        return { success: false, message };
    }
}