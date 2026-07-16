// src/app/owner/dashboard/page.tsx
import { prisma } from "@/lib/prisma";
import { requireOwnerAuth } from "@/lib/Authentication/RequireOwnerAuth";
import { DashboardUi } from "@/components/owner/DashboardUi";
import { serializePrisma } from "@/lib/serialize";

export default async function DashboardPage() {
    // 🚨 SECURITY: The un-hackable Auth Wall
    const { restaurantId } = await requireOwnerAuth();

    const [
        totalRecipes,
        pendingCount,
        approvedCount,
        rejectedCount,
        revokedCount,
        activeDraftsCount, // NEW: Track drafts waiting for resolution
        recentRecipes,
    ] = await Promise.all([
        prisma.recipe.count({ where: { restaurant_id: restaurantId } }),
        prisma.recipe.count({ where: { restaurant_id: restaurantId, status: "PENDING" } }),
        prisma.recipe.count({ where: { restaurant_id: restaurantId, status: "APPROVED" } }),
        prisma.recipe.count({ where: { restaurant_id: restaurantId, status: "REJECTED" } }),
        prisma.recipe.count({ where: { restaurant_id: restaurantId, status: "REVOKED" } }),
        // Fetch drafts that have been parsed by AI and are waiting for mapping
        prisma.recipeDraft.count({ where: { restaurant_id: restaurantId, status: "RESOLVED" } }),
        prisma.recipe.findMany({
            where: { restaurant_id: restaurantId },
            orderBy: { id: "desc" },
            take: 5,
        }),
    ]);

    const dashboardData = {
        totalRecipes,
        pendingCount,
        approvedCount,
        flaggedCount: rejectedCount + revokedCount,
        activeDraftsCount, // Pass to UI
        recentRecipes: serializePrisma(recentRecipes),
    };

    return <DashboardUi data={dashboardData} />;
}