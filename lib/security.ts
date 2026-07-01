// src/lib/security.ts
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { SessionUser, getSession } from "@/lib/auth"; // Consolidated import

export { getSession }; // Re-export for standard layout dependencies

/**
 * Guardrail Enforcement: Verifies identity, roles, and tenancy parameters.
 * Throws redirect errors immediately (bubbling outside try/catch) on failure [3].
 */
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

    // 4. Verification of Header Tenancy Integrity
    // Compare session details against the tenant identifier resolved by Layer 1 (Middleware)
    const headerList = await headers();
    const injectedTenantSlug = headerList.get("x-tenant-slug");

    if (currentUser.role === Role.restaurant_owner && injectedTenantSlug) {
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