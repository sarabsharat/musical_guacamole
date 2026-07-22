// app/auditor/dashboard/page.tsx
import React from "react";
import { getAuditorMetrics, getPendingAuditQueue } from "@/actions/AuditorActions";
import { AuditorMetricsCards } from "@/components/auditor/metrics-card";
import { AuditQueueTable } from "@/components/auditor/audit-queue-table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default async function AuditorDashboard() {
    // Fetch data concurrently for speed
    const [metricsRes, queueRes] = await Promise.all([
        getAuditorMetrics(),
        getPendingAuditQueue(),
    ]);

    if (!metricsRes.success || !queueRes.success) {
        return (
            <main className="p-8">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        {metricsRes.message || queueRes.message || "Failed to load dashboard data."}
                    </AlertDescription>
                </Alert>
            </main>
        );
    }

    return (
        <main className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Auditor Workspace</h1>
                <p className="text-muted-foreground mt-1">Review pending recipes and manage physical site audits.</p>
            </div>

            {/* Reusable Metrics Component */}
            <AuditorMetricsCards metrics={metricsRes.data} />

            {/* Reusable Queue Table Component */}
            <div className="bg-card border rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Pending Recipe Queue</h2>
                <AuditQueueTable queue={queueRes.data || []} />
            </div>
        </main>
    );
}