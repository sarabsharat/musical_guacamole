// src/lib/security.ts
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import {getSession } from "@/lib/auth";
import {SessionUser} from "@/lib/shared-types";

export { getSession };


//is this user allowd to be on this subdomain ?
export async function assertUserAccess(
    currentUser: SessionUser | null,
    allowedRoles: Role[],
    targetRestaurantId?: number
): Promise<void> {
    // 1. Session check
    if (!currentUser) {
        redirect("/auth/login");
    }

    // 2. Role validation
    if (!allowedRoles.includes(currentUser.role)) {
        notFound();
    }

    // 3. Tenancy Isolation check
    if (currentUser.role === Role.restaurant_owner) {
        if (!currentUser.restaurantId) {
            notFound();
        }

        // Ensure the owner's session scope matches the route's target restaurant scope
        if (targetRestaurantId && currentUser.restaurantId !== targetRestaurantId) {
            notFound();
        }
    }

  //check middleware injection,
    const headerList = await headers();
    const injectedTenantSlug = headerList.get("x-tenant-slug");

    if (currentUser.role === Role.restaurant_owner && injectedTenantSlug) {
        //db query to check who is trying to access the subdomain and confirm their actual slug
        const restaurant = await prisma.restaurant.findUnique({
            where: { id: currentUser.restaurantId },
            select: { slug: true },
        });

        if (!restaurant) {
            notFound();
        }

        // Prevent accessing incorrect subdomains (e.g. Mira trying to load Leen's dashboard)
        if (restaurant.slug !== injectedTenantSlug) {
            notFound();
        }
    }
}