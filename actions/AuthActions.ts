// actions/AuthActions.ts - Phase 3: User Registration
"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { z } from "zod";
import {Role} from "@prisma/client";

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
// REGISTER ACTION - Create new user account
// ═══════════════════════════════════════════════════════════════

export async function registerUser(input: z.infer<typeof registerSchema>) {
    try {
        const validated = registerSchema.safeParse(input);
        if (!validated.success) return { success: false, message: "Validation failed" };

        const { email, password, full_name, role } = validated.data;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) return { success: false, message: "Email already registered." };

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                email,
                full_name,
                password_hash: hashedPassword,
                role: role,
                is_active: true,
            },
        });

        return { success: true, message: "Account created successfully." };
    } catch (error) {
        console.error("❌ Registration error:", error);
        return { success: false, message: "An error occurred during registration." };
    }
}

// ═══════════════════════════════════════════════════════════════
// LOGOUT ACTION - Invalidate session
// ═══════════════════════════════════════════════════════════════

export async function logoutUser() {
    try {
        console.log("👋 [AuthAction] User logging out");
        // Auth.js handles session deletion - we just need to return success
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