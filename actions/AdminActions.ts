"use server";

import { RequireAdminAuth } from "@/lib/RequireAdminAuth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
    adminBulkApproveRecipeSchema,
    adminCreateIngredientRefSchema,
    adminDeleteRecipeSchema, adminDeleteRestaurantSchema,
    adminEditRecipeSchema,
    adminForceCertSchema,
    adminRecipeOverrideSchema,
    adminResetKitchenProfileSchema,
    adminResetPasswordSchema,
    adminToggleUserStatusSchema,
    adminUpdateIngredientRefSchema,
    adminUpdateUserSchema,
    adminUserSchema
} from "@/lib/validations/admin-schema";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";

export async function forceDeleteUser(userId: number) {
    await RequireAdminAuth();

    try {
        await prisma.user.delete({
            where: { id: userId }
        });

        revalidatePath("/admin/dashboard");

        return { success: true, message: "User eradicated from the system." };
    } catch (error) {
        console.error("Failed to delete user:", error);
        return { success: false, error: "Database operation failed." };
    }
}

export async function createUser(payload:unknown){
    // Bypasses standard registration. Allows the admin to directly assign a Role (e.g., creating a new jfda_officer).
    const session = await RequireAdminAuth();
    const validated = adminUserSchema.safeParse(payload);
    if (!validated.success) return { success: false, message: validated.error.issues[0].message };
    const { email, full_name, role, password, phone_number } = validated.data;

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) return { success: false, message: "Email already exists in system." };
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: { email, full_name, role, password_hash: hashedPassword, phone_number },
            });
            await tx.auditLog.create({
                data: {
                    actor_id: session.id,
                    action: "ADMIN_CREATED_USER",
                    payload: { target_user_id: newUser.id, assigned_role: role },
                },
            });
        });
        revalidatePath("/admin/users");
        return { success: true, message: `${role} account created successfully.` };
    } catch (error) {
        console.error("User Creation Failed:", error);
        return { success: false, message: "Failed to create user account." };
    }
}

export async function updateUser(payload:unknown){
    // Instantly upgrades or downgrades a user's permissions.
    const session = await RequireAdminAuth();
    const validated = adminUpdateUserSchema.safeParse(payload);
    if (!validated.success) return { success: false, message: validated.error.issues[0].message };
    const { userId, newRole, adminReason } = validated.data;

    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return { success: false, message: "User not found." };

        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: userId },
                data: { role: newRole },
            });
            await tx.auditLog.create({
                data: {
                    actor_id: session.id,
                    action: "ADMIN_UPDATED_USER_ROLE",
                    payload: { target_user_id: userId, old_role: user.role, new_role: newRole, reason: adminReason },
                },
            });
        });
        revalidatePath("/admin/users");
        return { success: true, message: `User role updated to ${newRole}.` };
    } catch (error) {
        console.error("Update user failed:", error);
        return { success: false, message: "Failed to update user role." };
    }
}

export async function toggleUserStatus(payload:unknown){
    //Deactivates a user (preventing login) without destroying their historical audit logs.
    const session = await RequireAdminAuth();
    const validated = adminToggleUserStatusSchema.safeParse(payload);
    if (!validated.success) {
        return { success: false, message: validated.error.issues[0].message };
    }
    const { userId, isActive, adminReason } = validated.data;

    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return { success: false, message: "User not found." };

        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: userId },
                data: { is_active: isActive },
            });
            await tx.auditLog.create({
                data: {
                    actor_id: session.id,
                    action: isActive ? "ADMIN_ACTIVATED_USER" : "ADMIN_DEACTIVATED_USER",
                    payload: { target_user_id: userId, reason: adminReason },
                },
            });
        });
        revalidatePath("/admin/users");
        return { success: true, message: `User ${isActive ? "activated" : "deactivated"}.` };
    } catch (error) {
        console.error("Toggle user status failed:", error);
        return { success: false, message: "Failed to update user status." };
    }
}

export async function resetPassword(payload:unknown){
    //Overrides the target user's password hash.
    const session = await RequireAdminAuth();
    const validated = adminResetPasswordSchema.safeParse(payload);
    if (!validated.success) {
        return { success: false, message: validated.error.issues[0].message };
    }
    const { userId, sendEmail } = validated.data;

    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return { success: false, message: "User not found." };

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
            // Integrate your email service here (e.g., Resend, Nodemailer)
            // await sendPasswordResetEmail(user.email, resetLink);
            console.log(`Password reset link for ${user.email}: ${resetLink}`);
        }

        await prisma.auditLog.create({
            data: {
                actor_id: session.id,
                action: "ADMIN_INITIATED_PASSWORD_RESET",
                payload: { target_user_id: userId, email_sent: sendEmail },
            },
        });

        revalidatePath("/admin/users");
        return {
            success: true,
            message: sendEmail
                ? "Password reset link sent to user's email."
                : `Password reset link generated (copy and share manually): ${resetLink}`,
            resetLink: sendEmail ? undefined : resetLink,
        };
    } catch (error) {
        console.error("Reset password failed:", error);
        return { success: false, message: "Failed to initiate password reset." };
    }
}

export async function updateCertification(
    payload:unknown){
    const session = await RequireAdminAuth();

    // 2. Zod Parsing
    const validated = adminForceCertSchema.safeParse(payload);
    if (!validated.success) return { success: false, message: validated.error.issues[0].message };
    const { restaurantId, level, status, adminReason } = validated.data;

    try {
        // 3. Prisma Transaction
        await prisma.$transaction(async (tx) => {
            await tx.restaurant.update({
                where: { id: restaurantId },
                data: { cert_level: level, cert_status: status },
            });

            await tx.auditLog.create({
                data: {
                    actor_id: session.id,
                    restaurant_id: restaurantId,
                    action: "ADMIN_FORCED_CERTIFICATION_UPDATE",
                    payload: { level, status, reason: adminReason },
                },
            });
        });

        revalidatePath("/admin/dashboard");
        revalidatePath(`/admin/restaurants/${restaurantId}`);

        return { success: true, message: `Establishment forcefully set to ${level} / ${status}.` };
    } catch (error) {
        console.error("Admin Override Failed:", error);
        return { success: false, message: "Database override failed." };
    }
}


export async function deleteRestaurant(payload:unknown){
    //Cascading delete that wipes the tenant, their kitchen profile, and all their recipes from the system.
    const session = await RequireAdminAuth();
    const validated = adminDeleteRestaurantSchema.safeParse(payload);
    if (!validated.success) {
        return { success: false, message: validated.error.issues[0].message };
    }
    const { restaurantId } = validated.data;

    try {
        const restaurant = await prisma.restaurant.findUnique({
            where: { id: restaurantId },
        });
        if (!restaurant) return { success: false, message: "Restaurant not found." };

        await prisma.$transaction(async (tx) => {
            await tx.restaurant.delete({ where: { id: restaurantId } });
            await tx.auditLog.create({
                data: {
                    actor_id: session.id,
                    action: "ADMIN_DELETED_RESTAURANT",
                    payload: { restaurant_id: restaurantId, business_name: restaurant.business_name },
                },
            });
        });
        revalidatePath("/admin/dashboard");
        revalidatePath("/admin/restaurants");
        return { success: true, message: "Restaurant and all associated data deleted." };
    } catch (error) {
        console.error("Delete restaurant failed:", error);
        return { success: false, message: "Failed to delete restaurant." };
    }
}

export async function resetKitchenProfile(payload: unknown) {
    const session = await RequireAdminAuth();
    const validated = adminResetKitchenProfileSchema.safeParse(payload);
    if (!validated.success) {
        return { success: false, message: validated.error.issues[0].message };
    }
    const { restaurantId } = validated.data;

    try {
        const profile = await prisma.kitchenControlProfile.findUnique({
            where: { restaurantId },
        });
        if (!profile) return { success: false, message: "Kitchen profile not found." };

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
                    actor_id: session.id,
                    restaurant_id: restaurantId,
                    action: "ADMIN_RESET_KITCHEN_PROFILE",
                    payload: { message: "Kitchen profile reset to defaults." },
                },
            });
        });
        revalidatePath(`/admin/restaurants/${restaurantId}`);
        return { success: true, message: "Kitchen profile has been reset." };
    } catch (error) {
        console.error("Reset kitchen profile failed:", error);
        return { success: false, message: "Failed to reset kitchen profile." };
    }
}

