import { getSession, assertUserAccess } from "@/lib/security";
import { getTenantContext } from "@/lib/tenant";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

export async function requireOwnerAuth() {
    const currentUser = await getSession();
    const tenant = await getTenantContext();

    // 1. Kick them out if they aren't logged in or don't have a restaurant
    if (!currentUser || !currentUser.restaurantId) {
        redirect("/auth/login");
    }

    // 2. Run your powerful bouncer function to verify roles and subdomains
    await assertUserAccess(currentUser, [Role.restaurant_owner], currentUser.restaurantId);

    // 3. Return the clean, guaranteed-safe data to your page
    return {
        currentUser,
        tenant,
        restaurantId: currentUser.restaurantId
    };
}