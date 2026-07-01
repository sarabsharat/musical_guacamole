// lib/auth.ts
import { Role } from "@prisma/client";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export interface SessionUser {
    id: number;
    email: string;
    role: Role;
    full_name: string;
    restaurantId?: number; // Pre-matched to seeded Restaurant ID
}

/**
 * Centrally manages our active mock session.
 * Automatically switches user profiles depending on the active subdomain and requested pathname.
 */
export async function getSession(): Promise<SessionUser | null> {
    const headerList = await headers();
    const tenantSlug = headerList.get("x-tenant-slug");
    const pathname = headerList.get("x-pathname") || "";

    // 1. If browsing an Auditor route, auto-login as Dr. Maha (Auditor)
    if (pathname.startsWith("/auditor")) {
        return {
            id: 3, // Seeded user ID for Maha
            role: Role.nutritionist_auditor,
            email: "maha@jfda.gov.jo",
            full_name: "Dr. Maha (Auditor)",
        };
    }

    // 2. If browsing a JFDA route, auto-login as Deema Officer
    if (pathname.startsWith("/jfda")) {
        return {
            id: 4, // Seeded user ID for Deema
            role: Role.jfda_officer,
            email: "deema@jfda.gov.jo",
            full_name: "Deema Officer (JFDA)",
        };
    }

    // 3. If browsing a specific Tenant subdomain, resolve the correct owner dynamically
    if (tenantSlug) {
        const restaurant = await prisma.restaurant.findUnique({
            where: { slug: tenantSlug },
            include: { owner: true }
        });

        if (restaurant && restaurant.owner) {
            return {
                id: restaurant.owner.id,
                email: restaurant.owner.email,
                role: Role.restaurant_owner,
                full_name: restaurant.owner.full_name,
                restaurantId: restaurant.id
            };
        }
    }

    // 4. Default Fallback: Leen Dumplings Owner (Restaurant ID: 1)
    return {
        id: 5,
        role: Role.restaurant_owner,
        restaurantId: 1,
        email: "leen@dumplings.com",
        full_name: "Leen Dumplings Owner",
    };
}