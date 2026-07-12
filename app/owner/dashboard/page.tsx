// src/app/owner/dashboard/page.tsx
import { prisma } from "@/lib/prisma";
import { requireOwnerAuth } from "@/lib/Authentication/RequireOwnerAuth";
import { DashboardUi } from "@/components/owner/DashboardUi";
import {serializePrisma} from "@/lib/serialize";

export default async function DashboardPage() {


    const { restaurantId } = await requireOwnerAuth();

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

    const dashboardData = {
        totalRecipes,
        pendingCount,
        approvedCount,
        flaggedCount: rejectedCount + revokedCount,
        recentRecipes: serializePrisma(recentRecipes),
    };

    return <DashboardUi data={dashboardData} />;
}