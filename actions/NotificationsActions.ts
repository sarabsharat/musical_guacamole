// actions/NotificationsActions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { cache } from "react";

// ─── Fetch Notifications for the Logged-In User ──────────────
export const getUserNotifications = cache(async function () {
    const session = await auth();
    if (!session?.user?.id) return [];

    const userId = Number(session.user.id);

    const notifications = await prisma.notification.findMany({
        where: { userId },
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
            // Include recipe details if you need them for the UI
            recipe: { select: { meal_name: true, restaurant: { select: { business_name: true } } } }
        }
    });

    return notifications.map((notif) => {
        const styling = parseStyling(notif.type);

        const timeAgo = new Date(notif.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        return {
            id: notif.id,
            title: notif.title,
            desc: notif.message,
            time: timeAgo,
            isRead: notif.isRead,
            type: notif.type,
            recipeId: notif.recipeId,
            textColor: styling.textColor,
            iconName: styling.iconName,
        };
    });
});

function parseStyling(type: string) {
    switch (type) {
        case "ACCOUNT_VERIFIED":
            return { textColor: "var(--primary)", iconName: "ShieldCheck" };
        case "ACCOUNT_PENDING":
            return { textColor: "var(--accent)", iconName: "Hourglass" };
        case "ACCOUNT_REJECTED":
            return { textColor: "var(--destructive)", iconName: "ShieldAlert" };
        case "SYSTEM":
            return { textColor: "var(--foreground)", iconName: "Info" };
        case "CERT_APPROVAL":
            return { textColor: "var(--primary)", iconName: "CheckCircle" };
        case "CERT_REJECTION":
            return { textColor: "var(--destructive)", iconName: "XCircle" };
        case "RECIPE_UPDATE":
            return { textColor: "var(--accent)", iconName: "Utensils" };
        default:
            return { textColor: "var(--muted-foreground)", iconName: "Bell" };
    }
}

// ─── Mark specific notifications as read ─────────────────────
export async function markNotificationsAsRead(notificationIds: number[]) {
    if (!notificationIds.length) return { success: false };

    const session = await auth();
    if (!session?.user?.id) return { success: false };

    const userId = Number(session.user.id);

    await prisma.notification.updateMany({
        where: {
            id: { in: notificationIds },
            userId: userId // Security check: Ensure they only mark their own as read
        },
        data: { isRead: true }
    });

    return { success: true };
}