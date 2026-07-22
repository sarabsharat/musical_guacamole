// app/jfda/page.tsx
import React from "react";
import { Header } from "@/components/shared/Header";
import { requireJfdaAuth } from "@/lib/Authentication/RequireJfdaAuth";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { getRecentAuditLogs, getReadNotificationIds } from "@/actions/NotificationsActions";

export default async function JFDALayout({ children }: { children: React.ReactNode }) {
    // 1. Authentication Wall and User Data Fetch
    const { user } = await requireJfdaAuth();

    // 2. Fetch global notifications (no restaurant filter)
    const recentLogs = await getRecentAuditLogs();
    const logIds = recentLogs.map(log => Number(log.id));
    let readIds: number[] = [];

    // 3. Safe Type Casting for User ID and fetch read status
    if (user?.id && logIds.length > 0) {
        const parsedUserId = parseInt(user.id as string, 10);

        if (!isNaN(parsedUserId)) {
            readIds = await getReadNotificationIds(parsedUserId, logIds);
        } else {
            console.error("Invalid user ID in JFDA layout:", user.id);
        }
    }

    // 4. Safe User Payload for Sidebar
    const safeUser = {
        name: user?.name || "Guest",
        email: user?.email || "",
        image: user?.image || null,
    };

    return (
        <div className="flex min-h-screen flex-col bg-background font-sans antialiased">
            <Header
                role={user?.role || null}
                title="JFDA Portal"
                user={user}
                notifications={recentLogs}
                readIds={readIds}
            />
            <SidebarProvider className="flex-1">
                <AppSidebar
                    variant="sidebar"
                    role={user?.role?.replace("_", " ") || "JFDA Officer"}
                    user={safeUser}
                />
                <SidebarInset>
                    <main className="flex-1 overflow-x-hidden">{children}</main>
                </SidebarInset>
            </SidebarProvider>
        </div>
    );
}