import { prisma } from "@/lib/prisma";
import { serializePrisma } from "@/lib/serialize";
import { requireOwnerAuth } from "@/lib/RequireOwnerAuth";
import { DashboardUi } from "@/components/owner/DashboardUi";

export default async function DashboardPage() {
    // 1. Authenticate & Secure
    const { restaurantId } = await requireOwnerAuth();

    // 2. Fetch all required data concurrently
    const [
        totalRecipes,
        pendingCount,
        approvedCount,
        rejectedCount,
        revokedCount,
        recentRecipes,
    ] = await Promise.all([
        prisma.recipe.count({ where: { restaurant_id: restaurantId } }),
        prisma.recipe.count({ where: { restaurant_id: restaurantId, status: "PENDING" } }),
        prisma.recipe.count({ where: { restaurant_id: restaurantId, status: "APPROVED" } }),
        prisma.recipe.count({ where: { restaurant_id: restaurantId, status: "REJECTED" } }),
        prisma.recipe.count({ where: { restaurant_id: restaurantId, status: "REVOKED" } }),
        prisma.recipe.findMany({
            where: { restaurant_id: restaurantId },
            orderBy: { id: "desc" },
            take: 5,
        }),
    ]);

    // 3. Package the data for the UI
    const dashboardData = {
        totalRecipes,
        pendingCount,
        approvedCount,
        flaggedCount: rejectedCount + revokedCount,
        recentRecipes: serializePrisma(recentRecipes),
    };

    // 4. Render the purely visual UI component, passing the secure data
    return <DashboardUi data={dashboardData} />;
}