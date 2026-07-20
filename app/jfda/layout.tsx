import React from "react";
import { Header } from "@/components/shared/Header";
import { requireJfdaAuth } from "@/lib/Authentication/RequireJfdaAuth";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { getRecentAuditLogs } from "@/actions/NotificationsActions";
import { prisma } from "@/lib/prisma";

export default async function JFDALayout({ children }: { children: React.ReactNode }) {
    const { user } = await requireJfdaAuth();

    // Fetch global notifications (no restaurant filter)
    const recentLogs = await getRecentAuditLogs();

    // Fetch IDs of notifications already read by this user
    const userId = Number(user?.id); // ensure number
    const readIds = await prisma.notificationRead.findMany({
        where: { userId },
        select: { recipeId: true },
    }).then(rows => rows.map(r => r.recipeId));

    const userProps = user
        ? {
            name: user.name ?? undefined,
            email: user.email ?? undefined,
            image: user.image ?? undefined,
        }
        : null;

    return (
        <div className="flex min-h-screen flex-col bg-background font-sans antialiased">
            <Header
                role={user?.role || null}
                title="JFDA Portal"
                user={userProps}
                notifications={recentLogs}
                readIds={readIds}
            />
            <SidebarProvider className="flex-1">
                <AppSidebar variant="sidebar" />
                <SidebarInset>
                    <main className="flex-1 overflow-x-hidden">{children}</main>
                </SidebarInset>
            </SidebarProvider>
        </div>
    );
}