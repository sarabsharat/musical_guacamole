"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation"; // 🚨 1. Import useRouter
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie,
    ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Cell,
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { FileText, Clock, CheckCircle, XCircle, Search, Filter, Calendar } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { useTranslation } from "react-i18next";

export interface Application {
    id: number;
    product: string;
    applicant: string;
    restaurantName: string;
    restaurantId: number;
    status: string;
    date: string;
}


interface DashboardClientProps {
    totalApplications: number;
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    recentApplications: Application[];
    applicationTrends: { month: string; applications: number }[];
    statusDistribution: { name: string; value: number; fill: string }[];
    userFullName: string;
}

const chartConfig = {
    pending: { label: "Pending", color: "var(--carbs)" },
    approved: { label: "Approved", color: "var(--protein)" },
    rejected: { label: "Rejected", color: "var(--fats)" },
    applications: { label: "Applications", color: "var(--primary)" },
};

export default function DashboardClient({
                                            totalApplications, pendingCount, approvedCount, rejectedCount,
                                            recentApplications, applicationTrends, statusDistribution,
                                        }: DashboardClientProps) {
    const { t } = useTranslation("common");
    const router = useRouter(); // 🚨 2. Initialize router

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [timeRange, setTimeRange] = useState("90d");

    const filteredApplications = useMemo(() => {
        return recentApplications.filter((app) => {
            const matchesSearch =
                app.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
                app.applicant.toLowerCase().includes(searchTerm.toLowerCase()) ||
                app.restaurantName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === "ALL" || app.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [recentApplications, searchTerm, statusFilter]);

    return (
        <div className="flex flex-col gap-6 px-4 lg:px-6 py-4">
            {/* ─── FILTER BAR ─────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-card border border-border p-4 rounded-xl shadow-sm">
                {/* ... (Keep your filter inputs exactly the same) ... */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder={t('jfda.dashboard.search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground hidden sm:inline" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="text-sm bg-background border border-input rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                            <option value="ALL">{t('jfda.dashboard.all_statuses')}</option>
                            <option value="PENDING">{t('jfda.dashboard.pending')}</option>
                            <option value="APPROVED">{t('jfda.dashboard.approved_label')}</option>
                            <option value="REJECTED">{t('jfda.dashboard.rejected_label')}</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* ─── TABLE ──────────────────────────────────────────────── */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                        <CardTitle>{t('jfda.dashboard.recent_applications')}</CardTitle>
                        <CardDescription>{t('jfda.dashboard.recent_applications_desc')}</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                            <tr className="border-b text-muted-foreground">
                                <th className="text-left py-3 font-medium">{t('jfda.dashboard.product_meal')}</th>
                                <th className="text-left py-3 font-medium">Restaurant</th>
                                <th className="text-left py-3 font-medium">{t('jfda.dashboard.status')}</th>
                                <th className="text-left py-3 font-medium">{t('jfda.dashboard.submission_date')}</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredApplications.map((app) => (
                                <tr
                                    key={app.id}
                                    // 🚨 3. Navigate directly to the restaurant page on click!
                                    onClick={() => router.push(`/restaurants/${app.restaurantId}`)}
                                    className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
                                >
                                    <td className="py-3 font-medium text-primary">{app.product}</td>
                                    <td className="py-3">{app.restaurantName}</td>
                                    <td className="py-3">
                                        <StatusBadge status={app.status} />
                                    </td>
                                    <td className="py-3 text-muted-foreground">{app.date}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* ─── METRIC CARDS ───────────────────────────────────────── */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('jfda.dashboard.total_applications')}</CardTitle>
                        <div className="p-2.5 bg-primary/10 text-primary rounded-md">
                            <FileText className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalApplications}</div>
                    </CardContent>
                </Card>

                <Card className="border-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('jfda.dashboard.pending_review')}</CardTitle>
                        <div className="p-2.5 rounded-md" style={{ backgroundColor: "color-mix(in srgb, var(--carbs) 10%, transparent)", color: "var(--carbs)" }}>
                            <Clock className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingCount}</div>
                        <p className="text-xs text-muted-foreground">{t('jfda.dashboard.awaiting_action')}</p>
                    </CardContent>
                </Card>

                <Card className="border-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('jfda.dashboard.approved_label')}</CardTitle>
                        <div className="p-2.5 rounded-md" style={{ backgroundColor: "color-mix(in srgb, var(--protein) 10%, transparent)", color: "var(--protein)" }}>
                            <CheckCircle className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{approvedCount}</div>
                    </CardContent>
                </Card>

                <Card className="border-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('jfda.dashboard.rejected_label')}</CardTitle>
                        <div className="p-2.5 rounded-md" style={{ backgroundColor: "color-mix(in srgb, var(--fats) 10%, transparent)", color: "var(--fats)" }}>
                            <XCircle className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{rejectedCount}</div>
                    </CardContent>
                </Card>
            </div>

            {/* ─── CHARTS ─────────────────────────────────────────────── */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('jfda.dashboard.application_submissions')}</CardTitle>
                        <CardDescription>{t('jfda.dashboard.monthly_volume')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[280px]">
                            <ChartContainer config={chartConfig} className="w-full h-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={applicationTrends}>
                                        <defs>
                                            <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="month" tickLine={false} axisLine={false} />
                                        <YAxis tickLine={false} axisLine={false} />
                                        <Tooltip content={<ChartTooltipContent />} />
                                        <Area
                                            type="monotone"
                                            dataKey="applications"
                                            stroke="var(--primary)"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorApps)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('jfda.dashboard.status_distribution')}</CardTitle>
                        <CardDescription>{t('jfda.dashboard.current_state')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[280px]">
                            <ChartContainer config={chartConfig} className="w-full h-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={statusDistribution}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={4}
                                            label
                                        >
                                            {statusDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<ChartTooltipContent />} />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('jfda.dashboard.overview_by_status')}</CardTitle>
                    <CardDescription>{t('jfda.dashboard.comparative_metrics')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[220px]">
                        <ChartContainer config={chartConfig} className="w-full h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={statusDistribution}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                                    <YAxis tickLine={false} axisLine={false} />
                                    <Tooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                        {statusDistribution.map((entry, index) => (
                                            <Cell key={`bar-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}