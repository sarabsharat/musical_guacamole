// actions/AuthActions.ts - UPGRADED: 3-Layer Security Protocol
"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { z } from "zod";
import { Role } from "@prisma/client";

// ═══════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════

const registerSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    full_name: z.string().min(2, "Name must be at least 2 characters"),
    role: z.nativeEnum(Role).default("restaurant_owner"),
});

type RegisterInput = z.infer<typeof registerSchema>;

// ═══════════════════════════════════════════════════════════════
// REGISTER USER - Create new user account
// ═══════════════════════════════════════════════════════════════

export async function registerUser(_mockUser: unknown, input: RegisterInput) {
    try {
        console.log("📝 [AuthAction] Registering user:", input.email);

        // ═════════════════════════════════════════════════════════════════
        // LAYER 2: ZOD VALIDATION - Validate input
        // ═════════════════════════════════════════════════════════════════
        const validated = registerSchema.safeParse(input);
        if (!validated.success) {
            console.log("❌ [AuthAction] Validation failed:", validated.error.issues);
            return {
                success: false,
                message: validated.error.issues[0]?.message || "Validation failed",
            };
        }

        const { email, password, full_name, role } = validated.data;

        // ═════════════════════════════════════════════════════════════════
        // SECURITY CHECKS - Email uniqueness, password hashing
        // ═════════════════════════════════════════════════════════════════

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            console.log("❌ [AuthAction] Email already registered:", email);
            return {
                success: false,
                message: "This email is already registered. Please login instead.",
            };
        }

        // Hash password with bcrypt
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log("🔐 [AuthAction] Password hashed for:", email);

        // Create user in database
        const newUser = await prisma.user.create({
            data: {
                email,
                full_name,
                password_hash: hashedPassword,
                role,
                is_active: true,
                // restaurantId will be null until onboarding for owners
            },
            select: {
                id: true,
                email: true,
                full_name: true,
                role: true,
            },
        });

        console.log("✅ [AuthAction] User created successfully:", email);

        return {
            success: true,
            message: "Account created successfully. Please log in.",
            data: {
                userId: newUser.id,
                email: newUser.email,
            },
        };
    } catch (error) {
        console.error("❌ [AuthAction] Error registering user:", error);
        return {
            success: false,
            message: "An error occurred during registration. Please try again.",
        };
    }
}

// ═══════════════════════════════════════════════════════════════
// LOGOUT USER - Invalidate session
// ═══════════════════════════════════════════════════════════════

export async function logoutUser(_mockUser: unknown) {
    try {
        console.log("👋 [AuthAction] User logging out");

        // Auth.js handles session deletion - we just return success
        return {
            success: true,
            message: "Logged out successfully",
        };
    } catch (error) {
        console.error("❌ [AuthAction] Error during logout:", error);
        return {
            success: false,
            message: "Error during logout",
        };
    }
}