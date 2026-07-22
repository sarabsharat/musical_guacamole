// app/auditor/page.tsx
import React from "react";
import { notFound } from "next/navigation";
import { Header } from "@/components/shared/Header";
import { requireAuditorAuth } from "@/lib/Authentication/RequireAuditorAuth";
import { getRecentAuditLogs, getReadNotificationIds } from "@/actions/NotificationsActions";

import { AppSidebar } from "@/components/ui/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default async function AuditorLayout({ children }: { children: React.ReactNode }) {
    // 1. Enforce auditor role and extract user (No need for auth()!)
    const { user, userId } = await requireAuditorAuth();

    // 2. Fetch recent notifications (global – no restaurant filter)
    const recentLogs = await getRecentAuditLogs();

    // 3. Extract IDs and check which ones are read
    const logIds = recentLogs.map(log => Number(log.id));
    let readIds: number[] = [];

    if (userId && logIds.length > 0) {
        readIds = await getReadNotificationIds(userId, logIds);
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
                tenant={null}
                user={user}
                notifications={recentLogs}
                readIds={readIds}
            />

            <SidebarProvider className="flex-1">
                <AppSidebar
                    variant="sidebar"
                    role={user?.role?.replace("_", " ") || "Auditor"}
                    user={safeUser}
                />

                <SidebarInset>
                    <main className="flex-1 overflow-x-hidden">
                        {children}
                    </main>
                </SidebarInset>
            </SidebarProvider>
        </div>
    );
}