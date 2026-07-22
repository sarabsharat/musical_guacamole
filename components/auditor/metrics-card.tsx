// components/auditor/metrics-cards.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, CheckCircle2, XCircle, Activity } from "lucide-react";
import {useEffect} from "react";

interface MetricsProps {
    metrics: {
        reviewsDone: number;
        pending: number;
        approved: number;
        rejected: number;
        approvalRate: number;
    } | undefined;
}

export function AuditorMetricsCards({ metrics }: MetricsProps) {
    if (!metrics) return null;

    const cards = [
        { title: "Pending Reviews", value: metrics.pending, icon: ClipboardList, color: "text-amber-500" },
        { title: "Total Approved", value: metrics.approved, icon: CheckCircle2, color: "text-emerald-500" },
        { title: "Total Rejected", value: metrics.rejected, icon: XCircle, color: "text-red-500" },
        { title: "Approval Rate", value: `${metrics.approvalRate}%`, icon: Activity, color: "text-blue-500" },
    ];


    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {cards.map((card, index) => {
                const Icon = card.icon;
                return (
                    <Card key={index}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {card.title}
                            </CardTitle>
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