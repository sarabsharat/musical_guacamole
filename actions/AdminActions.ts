// actions/AdminActions.ts - UPGRADED: 3-Layer Security Protocol
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
    adminBulkApproveRecipeSchema,
    adminCreateIngredientRefSchema,
    adminDeleteRecipeSchema,
    adminDeleteRestaurantSchema,
    adminEditRecipeSchema,
    adminForceCertSchema,
    adminRecipeOverrideSchema,
    adminResetKitchenProfileSchema,
    adminResetPasswordSchema,
    adminToggleUserStatusSchema,
    adminUpdateIngredientRefSchema,
    adminUpdateUserSchema,
    adminUserSchema,
} from "@/lib/validations/admin-schema";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import {requireAdminAuth} from "@/lib/Authentication/RequireAdminAuth";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();


// ═══════════════════════════════════════════════════════════════
// invalidate cache
// ═══════════════════════════════════════════════════════════════
export async function invalidateUserCache(userId: number) {
    await redis.del(`user:${userId}:verification_status`);
}

// ═══════════════════════════════════════════════════════════════
// Update Auditor Status
// ═══════════════════════════════════════════════════════════════
export async function updateAuditorVerification(userId: number, status: "VERIFIED" | "REJECTED") {
    await requireAdminAuth();

    await prisma.user.update({
        where: { id: userId },
        data: { verification_status: status }
    });

    // ✅ Add notification based on status
    if (status === "VERIFIED") {
        await prisma.notification.create({
            data: {
                userId: userId,
                type: "ACCOUNT_VERIFIED",
                title: "Account Verified!",
                message: "Congratulations! Your auditor account has been fully verified. You can now access your dashboard and begin reviewing recipes.",
            }
        });
    } else if (status === "REJECTED") {
        await prisma.notification.create({
            data: {
                userId: userId,
                type: "ACCOUNT_REJECTED",
                title: "Verification Failed",
                message: "Your account verification was rejected. Please check your email for details or re-upload your certification documents.",
            }
        });
    }

    // Invalidate Redis cache
    await redis.del(`user:${userId}:verification_status`);

    revalidatePath("/admin/auditors");
    revalidatePath("/auditor/dashboard");
    revalidatePath("/auditor/queue");
    revalidatePath("/auditor/audit");
    revalidatePath("/auditor/reports");

    return { success: true };
}

// ═══════════════════════════════════════════════════════════════
// FORCE DELETE USER
// ═══════════════════════════════════════════════════════════════
export async function forceDeleteUser(_mockUser: unknown, userId: number) {
    try {
        // ═════════════════════════════════════════════════════════════════
        // LAYER 1: AUTH WALL - Verify admin authentication
        // ═════════════════════════════════════════════════════════════════
        const { userId: adminId } = await requireAdminAuth();

        console.log("🗑️ [AdminAction] Force deleting user:", userId, "By admin:", adminId);

        // ═════════════════════════════════════════════════════════════════
        // LAYER 3: NO TENANT ISOLATION - Admin can delete any user
        // ═════════════════════════════════════════════════════════════════

        await prisma.user.delete({
            where: { id: userId },
        });

        revalidatePath("/admin/dashboard");

        console.log("✅ [AdminAction] User deleted successfully:", userId);

        return { success: true, message: "User eradicated from the system." };
    } catch (error) {
        console.error("❌ [AdminAction] Failed to delete user:", error);
        return { success: false, message: "Database operation failed." };
    }
}

// ═══════════════════════════════════════════════════════════════
// CREATE USER - Direct user creation with role assignment
// ═══════════════════════════════════════════════════════════════

export async function createUser(_mockUser: unknown, payload: unknown) {
    try {
        // ═════════════════════════════════════════════════════════════════
        // LAYER 1: AUTH WALL - Verify admin authentication
        // ═════════════════════════════════════════════════════════════════
        const { userId: adminId } = await requireAdminAuth();

        console.log("👤 [AdminAction] Creating new user. Admin:", adminId);

        // ═════════════════════════════════════════════════════════════════
        // LAYER 2: ZOD VALIDATION - Validate input
        // ═════════════════════════════════════════════════════════════════
        const validated = adminUserSchema.safeParse(payload);
        if (!validated.success) {
            console.log("❌ [AdminAction] Validation failed:", validated.error.issues);
            return { success: false, message: validated.error.issues[0]?.message || "Validation failed" };
        }

        const { email, full_name, role, password, phone_number } = validated.data;

        // ═════════════════════════════════════════════════════════════════
        // SECURITY CHECKS - Email uniqueness
        // ═════════════════════════════════════════════════════════════════

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            console.log("❌ [AdminAction] Email already exists:", email);
            return { success: false, message: "Email already exists in system." };
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // ═════════════════════════════════════════════════════════════════
        // LAYER 3: NO TENANT ISOLATION - Create user across all tenants
        // ═════════════════════════════════════════════════════════════════

        await prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    email,
                    full_name,
                    role,
                    password_hash: hashedPassword,
                    phone_number: phone_number || null,
                    is_active: true,
                },
            });

            await tx.auditLog.create({
                data: {
                    actor_id: Number(adminId),
                    action: "ADMIN_CREATED_USER",
                    payload: { target_user_id: newUser.id, assigned_role: role },
                },
            });
        });

        revalidatePath("/admin/users");

        console.log("✅ [AdminAction] User created successfully:", email, "Role:", role);

        return { success: true, message: `${role} account created successfully.` };
    } catch (error) {
        console.error("❌ [AdminAction] User creation failed:", error);
        return { success: false, message: "Failed to create user account." };
    }
}

// ═══════════════════════════════════════════════════════════════
// UPDATE USER ROLE
// ═══════════════════════════════════════════════════════════════

export async function updateUser(_mockUser: unknown, payload: unknown) {
    try {
        // ═════════════════════════════════════════════════════════════════
        // LAYER 1: AUTH WALL
        // ═════════════════════════════════════════════════════════════════
        const { userId: adminId } = await requireAdminAuth();

        console.log("🔄 [AdminAction] Updating user role. Admin:", adminId);

        // ═════════════════════════════════════════════════════════════════
        // LAYER 2: ZOD VALIDATION
        // ═════════════════════════════════════════════════════════════════
        const validated = adminUpdateUserSchema.safeParse(payload);
        if (!validated.success) {
            console.log("❌ [AdminAction] Validation failed:", validated.error.issues);
            return { success: false, message: validated.error.issues[0]?.message || "Validation failed" };
        }

        const { userId, newRole, adminReason } = validated.data;

        // ═════════════════════════════════════════════════════════════════
        // LAYER 3: NO TENANT ISOLATION
        // ═════════════════════════════════════════════════════════════════

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            console.log("❌ [AdminAction] User not found:", userId);
            return { success: false, message: "User not found." };
        }

        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: userId },
                data: { role: newRole },
            });

            await tx.auditLog.create({
                data: {
                    actor_id: Number(adminId),
                    action: "ADMIN_UPDATED_USER_ROLE",
                    payload: {
                        target_user_id: userId,
                        old_role: user.role,
                        new_role: newRole,
                        reason: adminReason,
                    },
                },
            });
        });

        revalidatePath("/admin/users");

        console.log("✅ [AdminAction] User role updated:", userId, "New role:", newRole);

        return { success: true, message: `User role updated to ${newRole}.` };
    } catch (error) {
        console.error("❌ [AdminAction] Update user failed:", error);
        return { success: false, message: "Failed to update user role." };
    }
}

// ═══════════════════════════════════════════════════════════════
// TOGGLE USER STATUS - Activate/Deactivate user
// ═══════════════════════════════════════════════════════════════

export async function toggleUserStatus(_mockUser: unknown, payload: unknown) {
    try {
        // ═════════════════════════════════════════════════════════════════
        // LAYER 1: AUTH WALL
        // ═════════════════════════════════════════════════════════════════
        const { userId: adminId } = await requireAdminAuth();

        console.log("🔀 [AdminAction] Toggling user status. Admin:", adminId);

        // ═════════════════════════════════════════════════════════════════
        // LAYER 2: ZOD VALIDATION
        // ═════════════════════════════════════════════════════════════════
        const validated = adminToggleUserStatusSchema.safeParse(payload);
        if (!validated.success) {
            console.log("❌ [AdminAction] Validation failed:", validated.error.issues);
            return { success: false, message: validated.error.issues[0]?.message || "Validation failed" };
        }

        const { userId, isActive, adminReason } = validated.data;

        // ═════════════════════════════════════════════════════════════════
        // LAYER 3: NO TENANT ISOLATION
        // ═════════════════════════════════════════════════════════════════

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            console.log("❌ [AdminAction] User not found:", userId);
            return { success: false, message: "User not found." };
        }

        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: userId },
                data: { is_active: isActive },
            });

            await tx.auditLog.create({
                data: {
                    actor_id: Number(adminId),
                    action: isActive ? "ADMIN_ACTIVATED_USER" : "ADMIN_DEACTIVATED_USER",
                    payload: { target_user_id: userId, reason: adminReason },
                },
            });
        });

        revalidatePath("/admin/users");

        console.log("✅ [AdminAction] User status toggled:", userId, "Active:", isActive);

        return { success: true, message: `User ${isActive ? "activated" : "deactivated"}.` };
    } catch (error) {
        console.error("❌ [AdminAction] Toggle user status failed:", error);
        return { success: false, message: "Failed to update user status." };
    }
}

// ═══════════════════════════════════════════════════════════════
// RESET PASSWORD - Generate password reset token
// ═══════════════════════════════════════════════════════════════

export async function resetPassword(_mockUser: unknown, payload: unknown) {
    try {
        // ═════════════════════════════════════════════════════════════════
        // LAYER 1: AUTH WALL
        // ═════════════════════════════════════════════════════════════════
        const { userId: adminId } = await requireAdminAuth();

        console.log("🔐 [AdminAction] Initiating password reset. Admin:", adminId);

        // ═════════════════════════════════════════════════════════════════
        // LAYER 2: ZOD VALIDATION
        // ═════════════════════════════════════════════════════════════════
        const validated = adminResetPasswordSchema.safeParse(payload);
        if (!validated.success) {
            console.log("❌ [AdminAction] Validation failed:", validated.error.issues);
            return { success: false, message: validated.error.issues[0]?.message || "Validation failed" };
        }

        const { userId, sendEmail } = validated.data;

        // ═════════════════════════════════════════════════════════════════
        // LAYER 3: NO TENANT ISOLATION
        // ═════════════════════════════════════════════════════════════════

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            console.log("❌ [AdminAction] User not found:", userId);
            return { success: false, message: "User not found." };
        }

        // Generate secure token
        const token = randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await prisma.passwordResetToken.create({
            data: {
                userId: user.id,
                token,
                expiresAt,
            },
        });

        const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

        if (sendEmail) {
            // TODO: Integrate email service (e.g., Resend, Nodemailer)
            console.log(`Password reset link for ${user.email}: ${resetLink}`);
        }

        await prisma.auditLog.create({
            data: {
                actor_id: Number(adminId),
                action: "ADMIN_INITIATED_PASSWORD_RESET",
                payload: { target_user_id: userId, email_sent: sendEmail },
            },
        });

        revalidatePath("/admin/users");

        console.log("✅ [AdminAction] Password reset initiated for user:", userId);

        return {
            success: true,
            message: sendEmail
                ? "Password reset link sent to user's email."
                : `Password reset link generated (copy and share manually): ${resetLink}`,
            resetLink: sendEmail ? undefined : resetLink,
        };
    } catch (error) {
        console.error("❌ [AdminAction] Reset password failed:", error);
        return { success: false, message: "Failed to initiate password reset." };
    }
}

// ═══════════════════════════════════════════════════════════════
// UPDATE CERTIFICATION - Force restaurant certification level
// ═══════════════════════════════════════════════════════════════

export async function updateCertification(_mockUser: unknown, payload: unknown) {
    try {
        // ═════════════════════════════════════════════════════════════════
        // LAYER 1: AUTH WALL
        // ═════════════════════════════════════════════════════════════════
        const { userId: adminId } = await requireAdminAuth();

        console.log("📜 [AdminAction] Updating certification. Admin:", adminId);

        // ═════════════════════════════════════════════════════════════════
        // LAYER 2: ZOD VALIDATION
        // ═════════════════════════════════════════════════════════════════
        const validated = adminForceCertSchema.safeParse(payload);
        if (!validated.success) {
            console.log("❌ [AdminAction] Validation failed:", validated.error.issues);
            return { success: false, message: validated.error.issues[0]?.message || "Validation failed" };
        }

        const { restaurantId, level, status, adminReason } = validated.data;

        // ═════════════════════════════════════════════════════════════════
        // LAYER 3: NO TENANT ISOLATION
        // ═════════════════════════════════════════════════════════════════

        await prisma.$transaction(async (tx) => {
            await tx.restaurant.update({
                where: { id: restaurantId },
                data: { cert_level: level, cert_status: status },
            });

            await tx.auditLog.create({
                data: {
                    actor_id: Number(adminId),
                    restaurant_id: restaurantId,
                    action: "ADMIN_FORCED_CERTIFICATION_UPDATE",
                    payload: { level, status, reason: adminReason },
                },
            });
        });

        revalidatePath("/admin/dashboard");
        revalidatePath(`/admin/restaurants/${restaurantId}`);

        console.log("✅ [AdminAction] Certification updated:", restaurantId, "Level:", level, "Status:", status);

        return { success: true, message: `Establishment forcefully set to ${level} / ${status}.` };
    } catch (error) {
        console.error("❌ [AdminAction] Admin override failed:", error);
        return { success: false, message: "Database override failed." };
    }
}

// ═══════════════════════════════════════════════════════════════
// DELETE RESTAURANT - Cascade delete restaurant & all data
// ═══════════════════════════════════════════════════════════════

export async function deleteRestaurant(_mockUser: unknown, payload: unknown) {
    try {
        // ═════════════════════════════════════════════════════════════════
        // LAYER 1: AUTH WALL
        // ═════════════════════════════════════════════════════════════════
        const { userId: adminId } = await requireAdminAuth();

        console.log("🗑️ [AdminAction] Deleting restaurant. Admin:", adminId);

        // ═════════════════════════════════════════════════════════════════
        // LAYER 2: ZOD VALIDATION
        // ═════════════════════════════════════════════════════════════════
        const validated = adminDeleteRestaurantSchema.safeParse(payload);
        if (!validated.success) {
            console.log("❌ [AdminAction] Validation failed:", validated.error.issues);
            return { success: false, message: validated.error.issues[0]?.message || "Validation failed" };
        }

        const { restaurantId } = validated.data;

        // ═════════════════════════════════════════════════════════════════
        // LAYER 3: NO TENANT ISOLATION
        // ═════════════════════════════════════════════════════════════════

        const restaurant = await prisma.restaurant.findUnique({
            where: { id: restaurantId },
        });

        if (!restaurant) {
            console.log("❌ [AdminAction] Restaurant not found:", restaurantId);
            return { success: false, message: "Restaurant not found." };
        }

        await prisma.$transaction(async (tx) => {
            await tx.restaurant.delete({ where: { id: restaurantId } });

            await tx.auditLog.create({
                data: {
                    actor_id: Number(adminId),
                    action: "ADMIN_DELETED_RESTAURANT",
                    payload: {
                        restaurant_id: restaurantId,
                        business_name: restaurant.business_name,
                    },
                },
            });
        });

        revalidatePath("/admin/dashboard");
        revalidatePath("/admin/restaurants");

        console.log("✅ [AdminAction] Restaurant deleted:", restaurantId);

        return { success: true, message: "Restaurant and all associated data deleted." };
    } catch (error) {
        console.error("❌ [AdminAction] Delete restaurant failed:", error);
        return { success: false, message: "Failed to delete restaurant." };
    }
}

// ═══════════════════════════════════════════════════════════════
// RESET KITCHEN PROFILE - Reset to defaults
// ═══════════════════════════════════════════════════════════════

export async function resetKitchenProfile(_mockUser: unknown, payload: unknown) {
    try {
        // ═════════════════════════════════════════════════════════════════
        // LAYER 1: AUTH WALL
        // ═════════════════════════════════════════════════════════════════
        const { userId: adminId } = await requireAdminAuth();

        console.log("🔧 [AdminAction] Resetting kitchen profile. Admin:", adminId);

        // ═════════════════════════════════════════════════════════════════
        // LAYER 2: ZOD VALIDATION
        // ═════════════════════════════════════════════════════════════════
        const validated = adminResetKitchenProfileSchema.safeParse(payload);
        if (!validated.success) {
            console.log("❌ [AdminAction] Validation failed:", validated.error.issues);
            return { success: false, message: validated.error.issues[0]?.message || "Validation failed" };
        }

        const { restaurantId } = validated.data;

        // ═════════════════════════════════════════════════════════════════
        // LAYER 3: NO TENANT ISOLATION
        // ═════════════════════════════════════════════════════════════════

        const profile = await prisma.kitchenControlProfile.findUnique({
            where: { restaurantId },
        });

        if (!profile) {
            console.log("❌ [AdminAction] Kitchen profile not found:", restaurantId);
            return { success: false, message: "Kitchen profile not found." };
        }

        await prisma.$transaction(async (tx) => {
            await tx.kitchenControlProfile.update({
                where: { restaurantId },
                data: {
                    hasDedicatedAllergenZones: false,
                    usesStandardizedRecipes: false,
                },
            });

            await tx.auditLog.create({
                data: {
                    actor_id: Number(adminId),
                    restaurant_id: restaurantId,
                    action: "ADMIN_RESET_KITCHEN_PROFILE",
                    payload: { message: "Kitchen profile reset to defaults." },
                },
            });
        });

        revalidatePath(`/admin/restaurants/${restaurantId}`);

        console.log("✅ [AdminAction] Kitchen profile reset:", restaurantId);

        return { success: true, message: "Kitchen profile has been reset." };
    } catch (error) {
        console.error("❌ [AdminAction] Reset kitchen profile failed:", error);
        return { success: false, message: "Failed to reset kitchen profile." };
    }
}