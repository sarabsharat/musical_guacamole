import { z } from "zod";
import { Role } from "@prisma/client";

export const registerSchema = z.object({
    email: z.string().email("Invalid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
});

// Discriminated union for onboarding – based on role
export const onboardingSchema = z.discriminatedUnion("role", [
    z.object({
        role: z.literal(Role.restaurant_owner),
        full_name: z.string().min(2, "Full name is required."),
        phone_number: z.string().min(1, "Phone number is required."),
        business_name: z.string().min(2, "Business name is required."),
        address_line: z.string().min(5, "Address is required."),
        slug: z.string()
            .min(3, "Slug must be at least 3 characters.")
            .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens."),
    }),
    z.object({
        role: z.enum([Role.nutritionist_auditor, Role.jfda_officer]),
        full_name: z.string().min(2, "Full name is required."),
        phone_number: z.string().min(1, "Phone number is required."),
    }),
]);