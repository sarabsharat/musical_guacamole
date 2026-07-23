// app/auditor/dashboard/page.tsx
"use client";

import React, { useMemo } from "react";
import { useSession } from "next-auth/react";
import { useAuditorData } from "../data-context";
import { AuditorMetricsCards } from "@/components/auditor/metrics-card";
import { AuditQueueList } from "@/components/auditor/audit-queue-list";
import { VerificationBanner } from "@/components/auditor/verification-banner";

export default function AuditorDashboard() {
    const { data: session } = useSession();
    const data = useAuditorData();
    const verificationStatus = session?.user?.verification_status;

    // ✅ Memoize the data to prevent re-renders
    const metrics = useMemo(() => data?.metrics || null, [data?.metrics]);
    const queue = useMemo(() => data?.queue || [], [data?.queue]);

    return (
        <main className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Auditor Workspace</h1>
                <p className="text-muted-foreground mt-1">Review pending recipes and manage physical site audits.</p>
            </div>

            <VerificationBanner verificationStatus={verificationStatus} />

            {metrics ? (
                <AuditorMetricsCards metrics={metrics} />
            ) : (
                <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg">
                    No metrics available.
                </div>
            )}

            <AuditQueueList queue={queue} variant="recent" />
        </main>
    );
}