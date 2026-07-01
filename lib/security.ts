import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

export interface SessionUser {
    id: number;
    role: Role;
    // This is optional because admins and auditors won't have a specific restaurant assigned to them
    restaurantId?: number;
}

export async function assertUserAccess(
    currentUser: SessionUser,
    allowedRoles: Role[],
    targetRestaurantId?: number,
) {
    // 1. Base check: Is this role allowed to trigger this action/page at all?
    if (!allowedRoles.includes(currentUser.role)) {
        redirect("/denier");
    }

    // 2. Global roles completely bypass tenant isolation (they need to see everything)
    if (
        currentUser.role === Role.platform_admin ||
        currentUser.role === Role.nutritionist_auditor ||
        currentUser.role === Role.jfda_officer
    ) {
        return true;
    }

    // 3. Strict 1:1 Tenant Isolation for Restaurant Owners
    if (currentUser.role === Role.restaurant_owner) {
        if (!currentUser.restaurantId) {
            throw new Error("SECURITY VIOLATION: No tenant restaurant assigned to this owner profile.");
        }

        // If a specific restaurant ID is requested, it MUST match the owner's assigned ID
        if (targetRestaurantId && currentUser.restaurantId !== targetRestaurantId) {
            throw new Error("SECURITY VIOLATION: Cross-tenant access denied.");
        }

        return true;
    }
}