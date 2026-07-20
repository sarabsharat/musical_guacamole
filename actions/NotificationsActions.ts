"use server"; // 👈 required for server actions

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function getRecentAuditLogs(restaurantId?: number) {
    const recipes = await prisma.recipe.findMany({
        where: restaurantId ? { restaurant_id: restaurantId } : {},
        take: 5,
        orderBy: { created_at: "desc" },
        include: {
            restaurant: { select: { business_name: true } },
        },
    });

    return recipes.map((recipe) => {
        const styling = parseStyling(recipe.status);

        let title = "Recipe Update";
        let desc = `Recipe "${recipe.meal_name}" status changed.`;

        if (recipe.status === "PENDING") {
            title = "New Recipe Submitted";
            desc = `${recipe.restaurant?.business_name || "A restaurant"} submitted ${recipe.meal_name} for review.`;
        } else if (recipe.status === "APPROVED") {
            title = "Recipe Approved";
            desc = `Recipe "${recipe.meal_name}" has been approved.`;
        } else if (recipe.status === "REJECTED" || recipe.status === "REVOKED") {
            title = "Recipe Rejected";
            desc = `Recipe "${recipe.meal_name}" was rejected by an auditor.`;
        }

        const timeAgo = new Date(recipe.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        return {
            id: recipe.id,
            title,
            desc,
            time: timeAgo,
            status: recipe.status,
            textColor: styling.textColor,
        };
    });
}

function parseStyling(status: string) {
    switch (status) {
        case "PENDING":
            return { textColor: "var(--accent)", iconName: "Clock" };
        case "APPROVED":
            return { textColor: "var(--primary)", iconName: "CheckCircle" };
        case "REJECTED":
        case "REVOKED":
            return { textColor: "var(--destructive)", iconName: "XCircle" };
        default:
            return { textColor: "var(--muted-foreground)", iconName: "Star" };
    }
}

// ─── Action to mark notifications as read ──────────────────
export async function markNotificationsAsRead(recipeIds: number[]) {
    if (!recipeIds.length) return; // nothing to mark

    const session = await auth();
    if (!session?.user?.id) return;

    const userId = Number(session.user.id); // 👈 convert to number

    await prisma.notificationRead.createMany({
        data: recipeIds.map(recipeId => ({
            userId,
            recipeId,
        })),
        skipDuplicates: true,
    });
}

export async function getReadNotificationIds(userId: number, recipeIds: number[]) {
    if (!recipeIds.length) return [];

    const reads = await prisma.notificationRead.findMany({
        where: {
            userId: userId,
            recipeId: { in: recipeIds }
        },
        select: { recipeId: true }
    });

    return reads.map(r => r.recipeId);
}