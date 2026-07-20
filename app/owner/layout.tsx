// src/app/owner/layout.tsx
import React from "react";
import { getTenantContext } from "@/lib/tenant";
import { notFound } from "next/navigation";
import { Header } from "@/components/shared/Header";
import { requireOwnerAuth } from "@/lib/Authentication/RequireOwnerAuth";
import { auth } from "@/lib/auth";
import { getRecentAuditLogs, getReadNotificationIds } from "@/actions/NotificationsActions"; // 🚨 Import the new function

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
    await requireOwnerAuth();
    const session = await auth();

    const tenant = await getTenantContext();
    if (!tenant) return notFound();

    // 1. Fetch the raw notifications
    const recentLogs = await getRecentAuditLogs(tenant.id);

    // 2. Extract the IDs and check the database to see which ones are already read!
    const logIds = recentLogs.map(log => Number(log.id));
    let readIds: number[] = [];

    if (session?.user?.id && logIds.length > 0) {
        readIds = await getReadNotificationIds(Number(session.user.id), logIds);
    }

    return (
        <div className="flex min-h-screen flex-col bg-background font-sans antialiased">
            <Header
                role={session?.user?.role || null}
                tenant={tenant}
                user={session?.user}
                notifications={recentLogs}
                readIds={readIds} // 🚨 Pass the database-verified read IDs into the Header!
            />

            <SidebarProvider className="flex-1">
                <AppSidebar
                    variant="sidebar"
                    tenantName={tenant.business_name}
                    role={session?.user?.role?.replace("_", " ")}
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