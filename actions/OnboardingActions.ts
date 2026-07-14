// actions/OnboardingActions.ts - UPGRADED: 3-Layer Security Protocol
"use server";

import { prisma } from "@/lib/prisma";

import { z } from "zod";
import {requireOwnerAuth} from "@/lib/Authentication/RequireOwnerAuth";

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

export async function createRestaurant(_mockUser: unknown, input: CreateRestaurantInput) {
    try {
        // ═════════════════════════════════════════════════════════════════
        // LAYER 1: AUTH WALL - Get authenticated owner context
        // ═════════════════════════════════════════════════════════════════
        const { userId, restaurantId } = await requireOwnerAuth();

        console.log("🏪 [OnboardingAction] Creating restaurant for user:", userId);

        // ═════════════════════════════════════════════════════════════════
        // LAYER 2: ZOD VALIDATION - Validate input payload
        // ═════════════════════════════════════════════════════════════════
        const validated = createRestaurantSchema.safeParse(input);
        if (!validated.success) {
            console.log("❌ [OnboardingAction] Validation failed:", validated.error.issues);
            return {
                success: false,
                message: validated.error.issues[0]?.message || "Validation failed",
            };
        }

        const { business_name, slug, address } = validated.data;
        const ownerIdInt = Number(userId);

        // ═════════════════════════════════════════════════════════════════
        // LAYER 3: TENANT ISOLATION - Check owner context
        // ═════════════════════════════════════════════════════════════════

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

        // Check if slug is unique (global check - no tenant filter)
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

        // Create restaurant in database
        const newRestaurant = await prisma.restaurant.create({
            data: {
                business_name,
                slug,
                owner_id: ownerIdInt,
                address_line: address || "",
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

export async function checkOnboardingStatus(_mockUser: unknown) {
    try {
        // ═════════════════════════════════════════════════════════════════
        // LAYER 1: AUTH WALL
        // ═════════════════════════════════════════════════════════════════
        const { userId, restaurantId } = await requireOwnerAuth();

        const userIdInt = Number(userId);

        // ═════════════════════════════════════════════════════════════════
        // LAYER 3: TENANT ISOLATION - Fetch only this user's restaurant
        // ═════════════════════════════════════════════════════════════════
        const user = await prisma.user.findUnique({
            where: { id: userIdInt },
            select: {
                restaurant: {
                    select: {
                        slug: true,
                    },
                },
            },
        });

        const isOnboarded = !!user?.restaurant?.slug;

        console.log(
            `📋 [OnboardingAction] Onboarding status for user ${userId}:`,
            isOnboarded
        );

        return {
            success: true,
            isOnboarded,
            slug: user?.restaurant?.slug || null,
            message: isOnboarded
                ? "User has completed onboarding"
                : "User needs to complete onboarding",
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

export async function suggestSlug(_mockUser: unknown, businessName: string) {
    try {
        // ═════════════════════════════════════════════════════════════════
        // LAYER 1: AUTH WALL - No sensitive operation, but verify auth
        // ═════════════════════════════════════════════════════════════════
        await requireOwnerAuth();

        // ═════════════════════════════════════════════════════════════════
        // LAYER 2: VALIDATION
        // ═════════════════════════════════════════════════════════════════
        if (!businessName || businessName.length < 2) {
            return {
                success: false,
                message: "Business name too short",
            };
        }

        const suggestedSlug = generateSlugFromName(businessName);

        // ═════════════════════════════════════════════════════════════════
        // LAYER 3: NO TENANT ISOLATION - Slug check is global
        // ═════════════════════════════════════════════════════════════════
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