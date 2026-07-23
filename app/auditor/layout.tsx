// app/auditor/layout.tsx
import React from "react";
import { Header } from "@/components/shared/Header";
import { requireAuditorAuth } from "@/lib/Authentication/RequireAuditorAuth";
import { getUserNotifications } from "@/actions/NotificationsActions"; // 👈 New Import
import { serializePrisma } from "@/lib/serialize";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AuditorDataProvider } from "./data-context";
import { getAuditorMetrics, getPendingAuditQueue } from "@/actions/auditor/data/data";

export default async function AuditorLayout({ children }: { children: React.ReactNode }) {
    const { user } = await requireAuditorAuth();

    // ─── Fetch all data in parallel ──────────────────────────────
    const [notifications, metricsRes, queueRes] = await Promise.all([
        getUserNotifications(), // 👈 Using the new universal notification fetcher
        getAuditorMetrics(),
        getPendingAuditQueue(),
    ]);

    // ─── Process read IDs (Drastically simplified!) ────────────────
    const readIds = notifications
        .filter((notif) => notif.isRead)
        .map((notif) => Number(notif.id));

    // ─── Extract data with fallbacks ──────────────────────────────
    const serializedMetrics = metricsRes.success && metricsRes.data
        ? metricsRes.data
        : null;

    const serializedQueue = queueRes.success && queueRes.data
        ? queueRes.data
        : [];

    // ─── Safe user data for sidebar ──────────────────────────────
    const safeUser = {
        name: user?.name || "Guest",
        email: user?.email || "",
        image: user?.image || null,
    };

    // ─── Data for context ──────────────────────────────────────────
    const auditorData = {
        recentLogs: notifications, // Rename or pass as is depending on your context expectations
        readIds,
        metrics: serializedMetrics,
        queue: serializedQueue,
    };

    return (
        <AuditorDataProvider data={auditorData}>
            <div className="flex min-h-screen flex-col bg-background font-sans antialiased">
                <Header
                    role={user?.role || null}
                    title="Auditor Portal"
                    user={user}
                    notifications={notifications} // 👈 Pass the new notifications here
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
        </AuditorDataProvider>
    );
}