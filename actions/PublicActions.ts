// actions/public.ts
"use server";

import { prisma } from "@/lib/prisma";

export async function getPublicRestaurantBySlug(slug: string) {
    try {
        const restaurant = await prisma.restaurant.findUnique({
            where: { slug },
            select: {
                business_name: true,
                logo_url: true,
                background_image_url: true,
            },
        });
        return restaurant;
    } catch (error) {
        console.error("Error fetching public restaurant:", error);
        return null;
    }
}