"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    LineChart,
    PieChart,
    ResponsiveContainer,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    Line,
    Pie,
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { ShieldCheck, FileText, Clock, CheckCircle, XCircle } from "lucide-react";

interface DashboardClientProps {
    totalApplications: number;
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    recentApplications: {
        id: number;
        product: string;
        applicant: string;
        status: string;
        date: string;
    }[];
    applicationTrends: { month: string; applications: number }[];
    statusDistribution: { name: string; value: number; fill: string }[];
    userFullName: string;
}

// 🚨 Define the chart config for Shadcn tooltips
const chartConfig = {
    pending: { label: "Pending", color: "var(--chart-3)" },
    approved: { label: "Approved", color: "var(--chart-1)" },
    rejected: { label: "Rejected", color: "var(--chart-4)" },
    applications: { label: "Applications", color: "hsl(var(--primary))" },
};

export default function DashboardClient({
                                            totalApplications,
                                            pendingCount,
                                            approvedCount,
                                            rejectedCount,
                                            recentApplications,
                                            applicationTrends,
                                            statusDistribution,
                                            userFullName,
                                        }: DashboardClientProps) {
    return (
        <div className="p-6 md:p-8 space-y-6">

            {/* Metric Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
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
                        <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                        <div className="p-2.5 bg-accent/10 text-accent rounded-md">
                            <Clock className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingCount}</div>
                        <p className="text-xs text-muted-foreground">Awaiting your action</p>
                    </CardContent>
                </Card>

                <Card className="border-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Approved</CardTitle>
                        <div className="p-2.5 bg-[var(--protein)]/10 text-[var(--protein)] rounded-md">
                            <CheckCircle className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{approvedCount}</div>
                    </CardContent>
                </Card>

                <Card className="border-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                        <div className="p-2.5 bg-destructive/10 text-destructive rounded-md">
                            <XCircle className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{rejectedCount}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-4 md:grid-cols-2">

                {/* 🚨 ADDED: Line Chart for Application Trends */}
                <Card>
                    <CardHeader>
                        <CardTitle>Applications Trend</CardTitle>
                        <CardDescription>Monthly submissions over the last 6 months</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px]">
                            <ChartContainer config={chartConfig} className="w-full h-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={applicationTrends}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="month" />
                                        <YAxis />
                                        <Tooltip content={<ChartTooltipContent />} />
                                        <Line
                                            type="monotone"
                                            dataKey="applications"
                                            stroke="var(--color-applications)"
                                            strokeWidth={2}
                                            dot={{ fill: "var(--color-applications)" }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Pie Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Status Distribution</CardTitle>
                        <CardDescription>Breakdown of all applications</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px]">
                            {/* 🚨 Updated to use the actual chartConfig */}
                            <ChartContainer config={chartConfig} className="w-full h-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={statusDistribution}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            label
                                        />
                                        <Tooltip content={<ChartTooltipContent />} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Applications Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Applications</CardTitle>
                    <CardDescription>Latest submissions requiring attention</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                            <tr className="border-b">
                                <th className="text-left py-2 font-medium">Product</th>
                                <th className="text-left py-2 font-medium">Applicant</th>
                                <th className="text-left py-2 font-medium">Status</th>
                                <th className="text-left py-2 font-medium">Date</th>
                            </tr>
                            </thead>
                            <tbody>
                            {recentApplications.map((app) => (
                                <tr key={app.id} className="border-b last:border-0">
                                    <td className="py-2">{app.product}</td>
                                    <td className="py-2">{app.applicant}</td>
                                    <td className="py-2">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                                    app.status === "PENDING"
                                                        ? "bg-yellow-100 text-yellow-800"
                                                        : app.status === "APPROVED"
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-red-100 text-red-800"
                                                }`}
                                            >
                                                {app.status}
                                            </span>
                                    </td>
                                    <td className="py-2">{app.date}</td>
                                </tr>
                            ))}
                            {recentApplications.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="py-4 text-center text-muted-foreground">
                                        No recent applications found.
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}