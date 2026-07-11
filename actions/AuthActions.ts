"use server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { registerSchema } from "@/lib/validations/auth-schema";
import { Role } from "@prisma/client";

export async function registerUser(payload: unknown) {
    const validated = registerSchema.safeParse(payload);
    if (!validated.success) {
        return { success: false, message: validated.error.issues[0].message };
    }
    const { email, password } = validated.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return { success: false, message: "Email already in use." };

    const hashed = await bcrypt.hash(password, 10);
    // Create user with temporary role (restaurant_owner) and empty placeholder fields
    await prisma.user.create({
        data: {
            email,
            password_hash: hashed,
            full_name: "",
            phone_number: "",
            role: Role.restaurant_owner, // temporary – will be updated in onboarding
            is_active: true,
        },
    });

    return { success: true, message: "Account created. Please log in." };
}