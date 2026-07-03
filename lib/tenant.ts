// src/lib/tenant.ts
import { cache } from "react";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export interface TenantContext {
    id: number;
    slug: string;
    business_name: string;
    cert_level: string;
    cert_status: string;
}

/**
 * Resolves tenant details on the server during the request lifecycle.
 * Uses React cache to prevent duplicate database select operations [5].
 */
export const getTenantContext = cache(async (): Promise<TenantContext | null> => {
    try {
        const headersList = await headers();
        const slug = headersList.get("x-tenant-slug");

        if (!slug) {
            return null;
        }

        const restaurant = await prisma.restaurant.findUnique({
            where: { slug },
            select: {
                id: true,
                slug: true,
                business_name: true,
                cert_level: true,
                cert_status: true,
            },
        });

        if (!restaurant) {
            return null;
        }

        return {
            id: restaurant.id,
            slug: restaurant.slug,
            business_name: restaurant.business_name,
            cert_level: restaurant.cert_level,
            cert_status: restaurant.cert_status,
        };
    } catch (error) {
        console.error("Tenant resolution failed:", error);
        return null;
    }
});

export async function getTenantBySlug(slug: string) {
    return prisma.restaurant.findUnique({
        where: { slug },
        include: { owner: true },
    });
}