// actions/OnboardingActions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { Role } from "@prisma/client";

const createRestaurantSchema = z.object({
    business_name: z.string().min(2),
    slug: z.string().min(3).regex(/^[a-z0-9-]+$/),
    address_line: z.string().optional().default(""),
    has_allergen_separation: z.boolean().default(false),
    uses_calorie_tracking: z.boolean().default(false),
    logo_url: z.string().url().optional().or(z.literal("")),
    background_image_url: z.string().url().optional().or(z.literal("")),
    estimated_recipe_count: z.number().int().min(0).optional(),
    delivery_apps: z.array(z.string()).default([]),
});

export async function createRestaurant(_mockUser: unknown, input: z.infer<typeof createRestaurantSchema>) {
    try {
        const session = await auth();
        if (!session?.user) {
            return { success: false, message: "You must be logged in." };
        }
        if (session.user.role !== Role.restaurant_owner) {
            return { success: false, message: "Only restaurant owners can create a restaurant." };
        }

        const validated = createRestaurantSchema.safeParse(input);
        if (!validated.success) {
            return { success: false, message: validated.error.issues[0]?.message };
        }

        const userId = parseInt(session.user.id, 10);
        const {
            business_name,
            slug,
            address_line,
            has_allergen_separation,
            uses_calorie_tracking,
            logo_url,
            background_image_url,
            estimated_recipe_count,
            delivery_apps,
        } = validated.data;

        // Check existing restaurant
        const existing = await prisma.restaurant.findFirst({
            where: { owner_id: userId },
        });
        if (existing) return { success: false, message: "You already have a restaurant." };

        const slugTaken = await prisma.restaurant.findUnique({ where: { slug } });
        if (slugTaken) return { success: false, message: `Slug "${slug}" is taken.` };

        // Create restaurant and kitchen profile in transaction
        const newRestaurant = await prisma.$transaction(async (tx) => {
            const restaurant = await tx.restaurant.create({
                data: {
                    business_name,
                    slug,
                    owner_id: userId,
                    address_line: address_line || "",
                    logo_url: logo_url || null,
                    background_image_url: background_image_url || null,
                    estimated_recipe_count: estimated_recipe_count ?? null,
                    delivery_apps: delivery_apps,
                },
            });

            await tx.kitchenControlProfile.create({
                data: {
                    restaurantId: restaurant.id,
                    hasDedicatedAllergenZones: has_allergen_separation,
                    usesStandardizedRecipes: uses_calorie_tracking,
                },
            });

            return restaurant;
        });

        return {
            success: true,
            message: "Restaurant created!",
            data: { restaurantId: newRestaurant.id, slug: newRestaurant.slug },
        };
    } catch (error) {
        console.error("❌ [OnboardingAction] Error:", error);
        return { success: false, message: "Something went wrong. Please try again." };
    }
}