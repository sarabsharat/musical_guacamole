// app/owner/layout.tsx
import React from "react";
import { getTenantContext } from "@/lib/tenant";
import { notFound } from "next/navigation";
import { Header } from "@/components/shared/Header";
import { requireOwnerAuth } from "@/lib/Authentication/RequireOwnerAuth";
import { getRecentAuditLogs, getReadNotificationIds } from "@/actions/NotificationsActions";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
    const { user } = await requireOwnerAuth();
    const tenant = await getTenantContext();
    if (!tenant) return notFound();

    const recentLogs = await getRecentAuditLogs(tenant.id);
    const logIds = recentLogs.map(log => Number(log.id));
    let readIds: number[] = [];
    if (user?.id && logIds.length > 0) {
        readIds = await getReadNotificationIds(Number(user.id), logIds);
    }

    const safeUser = {
        name: user?.name || "Guest",
        email: user?.email || "",
        image: user?.image_url || null,
    };

    return (
        <div className="flex min-h-screen flex-col bg-background font-sans antialiased">
            <Header
                role={user?.role || null}
                tenant={tenant}
                user={user}
                notifications={recentLogs}
                readIds={readIds}
            />

            <SidebarProvider className="flex-1">
                <AppSidebar
                    variant="sidebar"
                    role={user?.role ?? undefined}  // ✅ pass raw role
                    user={safeUser}
                />

                <SidebarInset>
                    <main className="flex-1 overflow-x-hidden">{children}</main>
                </SidebarInset>
            </SidebarProvider>
        </div>
    );
}