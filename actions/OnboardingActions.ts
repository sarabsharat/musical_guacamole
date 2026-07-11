"use server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { onboardingSchema } from "@/lib/validations/auth-schema";
import { Role } from "@prisma/client";

export async function completeOnboarding(payload: unknown) {
    const session = await getSession();
    if (!session) return { success: false, message: "Unauthorized." };

    const validated = onboardingSchema.safeParse(payload);
    if (!validated.success) {
        return { success: false, message: validated.error.issues.map(e => e.message).join(", ") };
    }

    const { role, full_name, phone_number } = validated.data;

    try {
        if (role === Role.restaurant_owner) {
            const { business_name, address_line, slug } = validated.data;

            const existing = await prisma.restaurant.findUnique({ where: { slug } });
            if (existing) {
                return { success: false, message: `Slug "${slug}" is already taken.` };
            }

            await prisma.$transaction(async (tx) => {
                await tx.restaurant.create({
                    data: {
                        slug,
                        business_name,
                        address_line,
                        owner: { connect: { id: session.id } },
                    },
                });
                await tx.user.update({
                    where: { id: session.id },
                    data: {
                        full_name,
                        phone_number,
                        role: Role.restaurant_owner,
                    },
                });
            });

            return { success: true, message: "Onboarding complete! Welcome.", slug };
        } else {
            await prisma.user.update({
                where: { id: session.id },
                data: {
                    full_name,
                    phone_number,
                    role,
                    is_active: false,
                },
            });
            return { success: true, message: "Account pending admin approval." };
        }
    } catch (error) {
        console.error("Onboarding error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return { success: false, message: `Onboarding failed: ${errorMessage}` };
    }
}