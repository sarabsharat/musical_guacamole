// src/components/owner/DashboardUi.tsx
import React from "react";
import Link from "next/link";
import { Recipe } from "@prisma/client";
import { StatusBadge } from "@/components/shared/status-badge";

// Shadcn & Icons
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChefHat, Clock, CheckCircle2, AlertCircle, Plus, FileText } from "lucide-react";

interface DashboardUIProps {
    data: {
        totalRecipes: number;
        pendingCount: number;
        approvedCount: number;
        flaggedCount: number;
        recentRecipes: Recipe[];
    };
}

export function DashboardUi({ data }: DashboardUIProps) {
    const { totalRecipes, pendingCount, approvedCount, flaggedCount, recentRecipes } = data;

    return (
        <div className="container mx-auto px-4 md:px-8 py-6 space-y-6 bg-background">
            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
                    <p className="text-muted-foreground mt-1">
                        Overview of your restaurant&apos;s compliance status and recipe portfolio.
                    </p>
                </div>
                <div className="flex items-center space-x-3">
                    <Link href="/owner/drafts">
                        <Button variant="outline" className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            View Drafts
                        </Button>
                    </Link>
                    <Link href="/owner/submit">
                        <Button className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Ingest Recipe
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Top Metrics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Recipes</CardTitle>
                        <ChefHat className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">{totalRecipes}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">{pendingCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Approved</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">{approvedCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Issues Flagged</CardTitle>
                        <AlertCircle className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">{flaggedCount}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Recipes List */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Recent Recipes</CardTitle>
                        <CardDescription>Your latest submitted recipes and their current status.</CardDescription>
                    </div>
                    <Link href="/owner/recipes">
                        <Button variant="ghost" className="text-sm">
                            View All
                        </Button>
                    </Link>
                </CardHeader>
                <CardContent>
                    {recentRecipes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed rounded-lg bg-muted/20">
                            <ChefHat className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
                            <p className="text-sm font-medium text-muted-foreground mb-4">
                                No recipes have been ingested yet.
                            </p>
                            <Link href="/owner/submit">
                                <Button>Add your first recipe</Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {recentRecipes.map((recipe) => (
                                <div
                                    key={recipe.id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-4 gap-4 bg-background shadow-sm transition-all hover:shadow-md"
                                >
                                    <div className="space-y-1">
                                        <p className="text-base font-semibold leading-none text-foreground">
                                            {recipe.meal_name}
                                        </p>
                                        <p className="text-sm text-muted-foreground  ">
                                            {Number(recipe.calories)} kcal • {Number(recipe.protein)}g P • {Number(recipe.carbs)}g C •{" "}
                                            {Number(recipe.total_fat)}g F
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <StatusBadge status={recipe.status} />
                                        <Link href={`/owner/recipes/${recipe.id}`}>
                                            <Button variant="secondary" size="sm">
                                                View
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}