import { Role } from "@prisma/client";
import { SessionUser } from "@/lib/security";

/**
 * MOCK AUTHENTICATION UTILITY
 * Replace this with your actual JWT or session verification logic later.
 */
export async function getSession(): Promise<SessionUser | null> {
    // This matches your Leen Dumplings record in the DB (ID: 5)
    // We hardcode the restaurantId: 1 because that is the ID of "leen-dumplings"
    return {
        id: 5,
        role: Role.restaurant_owner,
        restaurantId: 1,
    };
}