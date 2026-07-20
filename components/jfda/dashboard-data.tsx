import { prisma } from "@/lib/prisma";

export async function getDashboardData() {
    // Date range for trend
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [
        totalApplications,
        pendingCount,
        approvedCount,
        rejectedCount,
        recentRecipes,
        recipesLast6Months,
    ] = await Promise.all([
        prisma.recipe.count(),
        prisma.recipe.count({ where: { status: "PENDING" } }),
        prisma.recipe.count({ where: { status: "APPROVED" } }),
        prisma.recipe.count({ where: { status: { in: ["REJECTED", "REVOKED"] } } }),
        prisma.recipe.findMany({
            take: 3,
            orderBy: { created_at: "desc" },
            include: {
                restaurant: { select: { business_name: true } },
            },
        }),
        prisma.recipe.findMany({
            where: { created_at: { gte: sixMonthsAgo } },
            select: { created_at: true },
        }),
    ]);

    // Transform status distribution
    const statusDistribution = [
        { name: "Pending", value: pendingCount, fill: "var(--accent)" },    // or "var(--chart-3)"
        { name: "Approved", value: approvedCount, fill: "var(--primary)" }, // or "var(--chart-1)"
        { name: "Rejected", value: rejectedCount, fill: "var(--destructive)" }, // or "var(--chart-4)"
    ];


    const recentApplications = recentRecipes.map((recipe) => ({
        id: recipe.id,
        product: recipe.meal_name,
        applicant: recipe.restaurant?.business_name || "Unknown",

        // 🚨 ADD THESE TWO LINES: The client needs these to build the URL!
        restaurantName: recipe.restaurant?.business_name || "Unknown",
        restaurantId: recipe.restaurant_id,

        status: recipe.status,
        date: recipe.created_at.toISOString().split("T")[0],
    }));

    // Monthly aggregation for trend chart
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const trendMap = new Map();
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        trendMap.set(d.getMonth(), { month: monthNames[d.getMonth()], applications: 0 });
    }

    recipesLast6Months.forEach((recipe) => {
        if (!recipe.created_at) return;
        const m = new Date(recipe.created_at).getMonth();
        if (trendMap.has(m)) {
            trendMap.get(m).applications += 1;
        }
    });

    const applicationTrends = Array.from(trendMap.values());

    return {
        totalApplications,
        pendingCount,
        approvedCount,
        rejectedCount,
        recentApplications,
        applicationTrends,
        statusDistribution,
    };
}