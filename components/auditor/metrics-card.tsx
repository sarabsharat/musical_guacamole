// components/auditor/metrics-card.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, CheckCircle2, XCircle, Activity } from "lucide-react";

interface MetricsProps {
    metrics?: {
        reviewsDone: number;
        pending: number;
        approved: number;
        rejected: number;
        approvalRate: number;
    } | null;
}

export function AuditorMetricsCards({ metrics }: MetricsProps) {
    if (!metrics) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Loading...</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-muted-foreground">—</div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    const cards = [
        { title: "Pending Reviews", value: metrics.pending || 0, icon: ClipboardList, color: "text-amber-500" },
        { title: "Total Approved", value: metrics.approved || 0, icon: CheckCircle2, color: "text-emerald-500" },
        { title: "Total Rejected", value: metrics.rejected || 0, icon: XCircle, color: "text-red-500" },
        { title: "Approval Rate", value: `${metrics.approvalRate || 0}%`, icon: Activity, color: "text-blue-500" },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {cards.map((card, index) => {
                const Icon = card.icon;
                return (
                    <Card key={index}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                            <Icon className={`h-4 w-4 ${card.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{card.value}</div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}