// actions/OnboardingActions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { z } from "zod";

// ═══════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════

const createRestaurantSchema = z.object({
    business_name: z.string().min(2, "Business name must be at least 2 characters"),
    slug: z
        .string()
        .min(3, "Slug must be at least 3 characters")
        .max(50, "Slug must be at most 50 characters")
        .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
    address: z.string().optional(),
    phone: z.string().optional(),
});

type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;

// ═══════════════════════════════════════════════════════════════
// HELPER: Generate slug from business name
// ═══════════════════════════════════════════════════════════════

function generateSlugFromName(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

// ═══════════════════════════════════════════════════════════════
// CREATE RESTAURANT ACTION
// ═══════════════════════════════════════════════════════════════

export async function createRestaurant(input: CreateRestaurantInput) {
    try {
        console.log("🏪 [OnboardingAction] Creating restaurant:", input.business_name);

        const session = await getServerSession();

        if (!session || !session.id) {
            console.log("❌ [OnboardingAction] User not authenticated");
            return {
                success: false,
                message: "You must be logged in to create a restaurant.",
            };
        }

        const validated = createRestaurantSchema.safeParse(input);
        if (!validated.success) {
            console.log("❌ [OnboardingAction] Validation failed:", validated.error.issues);
            return {
                success: false,
                message: validated.error.issues[0]?.message || "Validation failed",
            };
        }

        const { business_name, slug, address } = validated.data;
        const ownerIdInt = parseInt(session.id, 10);

        // Check if user already has a restaurant
        const existingRestaurant = await prisma.restaurant.findFirst({
            where: { owner_id: ownerIdInt },
        });

        if (existingRestaurant) {
            console.log("❌ [OnboardingAction] User already has a restaurant");
            return {
                success: false,
                message: "You already have a restaurant. Contact support to create another.",
            };
        }

        // Check if slug is unique
        const existingSlug = await prisma.restaurant.findUnique({
            where: { slug },
        });

        if (existingSlug) {
            console.log("❌ [OnboardingAction] Slug already taken:", slug);
            return {
                success: false,
                message: `The slug "${slug}" is already taken. Please choose another.`,
            };
        }

        // Create restaurant in database (No transaction needed since User table isn't modified)
        const newRestaurant = await prisma.restaurant.create({
            data: {
                business_name,
                slug,
                owner_id: ownerIdInt,
                address_line: address || "", // Mapped correctly to your schema
                cert_status: "PENDING",
                cert_level: "LEVEL_1",
            },
        });

        console.log("✅ [OnboardingAction] Restaurant created successfully:", slug);

        return {
            success: true,
            message: "Restaurant created successfully!",
            data: {
                restaurantId: newRestaurant.id,
                slug: newRestaurant.slug,
                businessName: newRestaurant.business_name,
            },
        };
    } catch (error) {
        console.error("❌ [OnboardingAction] Error creating restaurant:", error);
        return {
            success: false,
            message: "An error occurred while creating your restaurant. Please try again.",
        };
    }
}

// ═══════════════════════════════════════════════════════════════
// CHECK ONBOARDING STATUS
// ═══════════════════════════════════════════════════════════════

export async function checkOnboardingStatus() {
    try {
        const session = await getServerSession();

        if (!session || !session.id) {
            return {
                success: true,
                isOnboarded: false,
                message: "Not authenticated",
            };
        }

        const user = await prisma.user.findUnique({
            where: { id: parseInt(session.id, 10) },
            select: {
                // Fetch the relation object directly instead of a non-existent scalar field
                restaurant: {
                    select: {
                        slug: true,
                    },
                },
            },
        });

        const isOnboarded = !!user?.restaurant?.slug;

        console.log(`📋 [OnboardingAction] Onboarding status for user ${session.id}:`, isOnboarded);

        return {
            success: true,
            isOnboarded,
            slug: user?.restaurant?.slug || null,
            message: isOnboarded ? "User has completed onboarding" : "User needs to complete onboarding",
        };
    } catch (error) {
        console.error("❌ [OnboardingAction] Error checking onboarding status:", error);
        return {
            success: false,
            isOnboarded: false,
            message: "Error checking onboarding status",
        };
    }
}

// ═══════════════════════════════════════════════════════════════
// SUGGEST SLUG
// ═══════════════════════════════════════════════════════════════

export async function suggestSlug(businessName: string) {
    try {
        if (!businessName || businessName.length < 2) {
            return {
                success: false,
                message: "Business name too short",
            };
        }

        const suggestedSlug = generateSlugFromName(businessName);

        const existingSlug = await prisma.restaurant.findUnique({
            where: { slug: suggestedSlug },
        });

        return {
            success: true,
            slug: suggestedSlug,
            available: !existingSlug,
            message: existingSlug ? "Slug is taken, please modify" : "Slug is available",
        };
    } catch (error) {
        console.error("❌ [OnboardingAction] Error suggesting slug:", error);
        return {
            success: false,
            message: "Error generating slug suggestion",
        };
    }
}