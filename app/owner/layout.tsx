// app/owner/layout.tsx
import React from "react";
import { getTenantContext } from "@/lib/tenant";
import { notFound } from "next/navigation";
import { Header } from "@/components/shared/Header";
import { requireOwnerAuth } from "@/lib/Authentication/RequireOwnerAuth";
import { getUserNotifications } from "@/actions/NotificationsActions"; // 👈 New import
import { AppSidebar } from "@/components/ui/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
    const { user } = await requireOwnerAuth();
    const tenant = await getTenantContext();
    if (!tenant) return notFound();

    // ─── Fetch notifications using the new system ──────────────────
    const notifications = await getUserNotifications();

    // ─── Extract read IDs ──────────────────────────────────────────
    const readIds = notifications
        .filter((notif: any) => notif.isRead)
        .map((notif: any) => Number(notif.id));

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
                notifications={notifications} // 👈 New notifications
                readIds={readIds}
            />

            <SidebarProvider className="flex-1">
                <AppSidebar
                    variant="sidebar"
                    role={user?.role ?? undefined}
                    user={safeUser}
                />

                <SidebarInset>
                    <main className="flex-1 overflow-x-hidden">{children}</main>
                </SidebarInset>
            </SidebarProvider>
        </div>
    );
}