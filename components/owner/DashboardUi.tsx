"use client";

import React from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import {
    Sparkles,
    FileText,
    CheckCircle,
    AlertOctagon,
    Clock,
    ArrowRight,
} from "lucide-react";
import {StatusBadge} from "@/components/shared/status-badge";

interface DashboardData {
    totalRecipes: number;
    pendingCount: number;
    approvedCount: number;
    flaggedCount: number;
    activeDraftsCount: number;
    recentRecipes: any[];
}

export function DashboardUi({ data }: { data: DashboardData }) {
    const { t } = useTranslation();

    return (
        <main className="min-h-screen bg-background p-6 md:p-8 space-y-8">

            {/* Header section */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        {t('overview')}
                    </h1>
                    <p className="text-base text-muted-foreground mt-1">
                        {t('manage_portfolio')}
                    </p>
                </div>

                <Link
                    href="/owner/submit"
                    className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-lg text-base font-semibold transition-all"
                >
                    <Sparkles className="h-5 w-5" />
                    {t('new_recipe')}
                </Link>
            </header>

            {/* Metrics Grid */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">

                {/* Actionable Drafts */}
                <Link
                    href="/owner/drafts"
                    className="bg-card border border-accent/40 hover:border-accent p-5 md:p-6 rounded-xl transition-colors group"
                >
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-2.5 bg-accent/10 text-accent rounded-md group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                            <Clock className="h-5 w-5" />
                        </div>
                        <span className="text-3xl font-bold text-card-foreground">
                            {data.activeDraftsCount}
                        </span>
                    </div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t('actionable_drafts')}
                    </div>
                </Link>

                {/* Total Recipes */}
                <div className="bg-card border border-border p-5 md:p-6 rounded-xl">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-2.5 bg-muted text-muted-foreground rounded-md">
                            <FileText className="h-5 w-5" />
                        </div>
                        <span className="text-3xl font-bold text-card-foreground">
                            {data.totalRecipes}
                        </span>
                    </div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t('total_recipes')}
                    </div>
                </div>

                {/* Pending Audit */}
                <div className="bg-card border border-border p-5 md:p-6 rounded-xl">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-2.5 bg-[var(--carbs)]/10 text-[var(--carbs)] rounded-md">
                            <Clock className="h-5 w-5" />
                        </div>
                        <span className="text-3xl font-bold text-card-foreground">
                            {data.pendingCount}
                        </span>
                    </div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t('pending_audit')}
                    </div>
                </div>

                {/* Approved */}
                <div className="bg-card border border-border p-5 md:p-6 rounded-xl">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-2.5 bg-[var(--protein)]/10 text-[var(--protein)] rounded-md">
                            <CheckCircle className="h-5 w-5" />
                        </div>
                        <span className="text-3xl font-bold text-card-foreground">
                            {data.approvedCount}
                        </span>
                    </div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t('approved')}
                    </div>
                </div>

                {/* Flagged */}
                <div className="bg-card border border-border p-5 md:p-6 rounded-xl">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-2.5 bg-[var(--fats)]/10 text-[var(--fats)] rounded-md">
                            <AlertOctagon className="h-5 w-5" />
                        </div>
                        <span className="text-3xl font-bold text-card-foreground">
                            {data.flaggedCount}
                        </span>
                    </div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t('flagged')}
                    </div>
                </div>
            </section>

            {/* Recent Recipes */}
            {data.recentRecipes.length > 0 && (
                <section className="bg-card border border-border rounded-xl">
                    <div className="p-5 md:p-6 border-b border-border flex justify-between items-center">
                        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                            {t('recent_additions')}
                        </h2>
                        <Link
                            href="/owner/recipes"
                            className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                        >
                            {t('view_audit_log')} <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>

                    <div className="divide-y divide-border/50">
                        {data.recentRecipes.map((recipe) => (
                            <div
                                key={recipe.id}
                                className="flex justify-between items-center px-5 md:px-6 py-3 hover:bg-muted/40 transition-colors"
                            >
                                <span className="text-base font-medium text-card-foreground">
                                    {recipe.meal_name}
                                </span>
                                <StatusBadge status={recipe.status} />
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </main>
    );
}