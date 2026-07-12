import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";

export async function requireOwnerAuth() {
    const session = await getServerSession();

    // 1. Ensure user is logged in
    if (!session) {
        redirect("/login");
    }

    // 2. Ensure user has the correct role
    if (session.role !== "restaurant_owner") {
        redirect("/login?error=unauthorized");
    }

    // 3. Ensure they have a linked restaurant ID
    if (!session.restaurantId) {
        redirect("/onboarding");
    }

    // Return the safe, validated data for Prisma to use
    return {
        userId: session.id,
        restaurantId: session.restaurantId,
        slug: session.slug,
    };
}