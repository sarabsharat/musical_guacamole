"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface DashboardData {
    totalRecipes: number;
    pendingCount: number;
    approvedCount: number;
    flaggedCount: number;
    recentRecipes: any[];
}

export function DashboardUi({ data }: { data: DashboardData }) {
    return (
        <div className="min-h-screen bg-background space-y-8 p-4 md:p-8">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-black tracking-tight">Dashboard</h1>
                <p className="mt-2 text-muted-foreground">Overview of your restaurants compliance status</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Recipes"
                    count={data.totalRecipes}
                    icon={<TrendingUp className="h-4 w-4" />}
                    variant="default"
                />
                <StatCard
                    title="Approved"
                    count={data.approvedCount}
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    variant="success"
                />
                <StatCard
                    title="Pending Review"
                    count={data.pendingCount}
                    icon={<Clock className="h-4 w-4" />}
                    variant="warning"
                />
                <StatCard
                    title="Flagged Issues"
                    count={data.flaggedCount}
                    icon={<AlertCircle className="h-4 w-4" />}
                    variant="destructive"
                />
            </div>

            {/* Recent Recipes Section */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                        <CardTitle>Recent Recipes</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            Your {data.recentRecipes.length} most recent submissions
                        </p>
                    </div>
                    <Button  variant="outline" size="sm">
                        <Link href="/owner/recipes">
                            View All
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </CardHeader>
                <CardContent>
                    {data.recentRecipes.length === 0 ? (
                        <div className="py-12 text-center">
                            <p className="text-muted-foreground mb-4">No recipes yet</p>
                            <Button >
                                <Link href="/owner/recipes/new">Create Your First Recipe</Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {data.recentRecipes.map((recipe) => (
                                <Link
                                    key={recipe.id}
                                    href={`/owner/recipes/${recipe.id}`}
                                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent transition-colors group"
                                >
                                    <div className="flex-1">
                                        <p className="font-medium group-hover:text-primary transition-colors">
                                            {recipe.meal_name || "Unnamed Recipe"}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Last updated: {new Date(recipe.updated_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <StatusBadge status={recipe.status} />
                                </Link>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// StatCard Component - Reusable stat display
// ═══════════════════════════════════════════════════════════════

interface StatCardProps {
    title: string;
    count: number;
    icon?: React.ReactNode;
    variant?: "default" | "success" | "warning" | "destructive";
}

function StatCard({ title, count, icon, variant = "default" }: StatCardProps) {
    const variantStyles = {
        default: "bg-blue-50 border-blue-200 text-blue-900",
        success: "bg-green-50 border-green-200 text-green-900",
        warning: "bg-amber-50 border-amber-200 text-amber-900",
        destructive: "bg-red-50 border-red-200 text-red-900",
    };

    const iconStyles = {
        default: "text-blue-600",
        success: "text-green-600",
        warning: "text-amber-600",
        destructive: "text-red-600",
    };

    return (
        <Card className={`border ${variantStyles[variant]}`}>
            <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium opacity-80">{title}</p>
                        <p className="text-3xl font-black mt-2">{count}</p>
                    </div>
                    {icon && <div className={`${iconStyles[variant]} opacity-60`}>{icon}</div>}
                </div>
            </CardContent>
        </Card>
    );
}

// ═══════════════════════════════════════════════════════════════
// StatusBadge Component - Reusable status indicator
// ═══════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: string }) {
    const variants: Record<string, any> = {
        APPROVED: { variant: "default", label: "Approved" },
        PENDING: { variant: "secondary", label: "Pending" },
        REJECTED: { variant: "destructive", label: "Rejected" },
        REVOKED: { variant: "destructive", label: "Revoked" },
    };

    const config = variants[status] || { variant: "outline", label: status };

    return <Badge variant={config.variant as any}>{config.label}</Badge>;
}