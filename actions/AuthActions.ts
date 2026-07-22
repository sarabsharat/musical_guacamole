// actions/AuthActions.ts
"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { z } from "zod";
import { Prisma, Role, VerificationStatus } from "@prisma/client";

const registerSchema = z.object({
    email: z.string().email(),
    phone_number: z.string().min(9),
    password: z.string().min(6),
    full_name: z.string().min(2),
    role: z.enum(["restaurant_owner", "nutritionist_auditor", "jfda_officer", "platform_admin"]),
});

type RegisterInput = z.infer<typeof registerSchema>;

export async function registerUser(input: RegisterInput) {
    const validated = registerSchema.safeParse(input);
    if (!validated.success) return { success: false, message: validated.error.issues[0].message };

    const { email, phone_number, password, full_name, role } = validated.data;

    try {
        const where: Prisma.UserWhereInput = {
            OR: [
                { email },
                { phone_number },
            ],
        };

        const existingUser = await prisma.user.findFirst({ where });
        if (existingUser) return { success: false, message: "User already exists." };

        const password_hash = await bcrypt.hash(password, 10);

        let verification_status: VerificationStatus | undefined;
        if (role === "jfda_officer" || role === "platform_admin") {
            verification_status = VerificationStatus.VERIFIED;
        } else if (role === "nutritionist_auditor") {
            verification_status = VerificationStatus.PENDING;
        } else {
            verification_status = undefined;
        }

        // Now email and phone_number are guaranteed to be strings
        const data: Prisma.UserCreateInput = {
            email,
            phone_number,
            password_hash,
            full_name,
            role,
            is_active: true,
            verification_status,
        };

        await prisma.user.create({ data });

        return { success: true, message: "User created." };
    } catch (error) {
        console.error("Registration error:", error);
        return { success: false, message: "Registration failed." };
    }
}

export async function logoutUser() {
    return { success: true, message: "Logged out successfully" };
}