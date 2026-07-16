"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, FileText, CheckCircle, AlertOctagon, Clock, ArrowRight } from "lucide-react";

interface DashboardData {
    totalRecipes: number;
    pendingCount: number;
    approvedCount: number;
    flaggedCount: number;
    activeDraftsCount: number;
    recentRecipes: any[];
}

export function DashboardUi({ data }: { data: DashboardData }) {
    return (
        <main className="min-h-screen bg-background p-6 md:p-8 space-y-8">

            {/* Header section */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground tracking-tight">Overview</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage your recipe portfolio and active ingestion drafts.</p>
                </div>

                <Link
                    href="/owner/submit"
                    className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
                >
                    <Sparkles size={16} />
                    New Recipe
                </Link>
            </header>

            {/* Metrics Grid */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">

                {/* Actionable Item */}
                <Link href="/owner/drafts" className="bg-card border border-accent/40 hover:border-accent p-5 rounded-xl transition-colors group">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-2 bg-accent/10 text-accent rounded-md group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                            <Clock size={18} />
                        </div>
                        <span className="text-2xl font-bold text-card-foreground">{data.activeDraftsCount}</span>
                    </div>
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actionable Drafts</div>
                </Link>

                {/* Standard Metrics */}
                <div className="bg-card border border-border p-5 rounded-xl">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-2 bg-muted text-muted-foreground rounded-md"><FileText size={18} /></div>
                        <span className="text-2xl font-bold text-card-foreground">{data.totalRecipes}</span>
                    </div>
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Recipes</div>
                </div>

                <div className="bg-card border border-border p-5 rounded-xl">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-md"><Clock size={18} /></div>
                        <span className="text-2xl font-bold text-card-foreground">{data.pendingCount}</span>
                    </div>
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Pending Audit</div>
                </div>

                <div className="bg-card border border-border p-5 rounded-xl">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-2 bg-green-500/10 text-green-500 rounded-md"><CheckCircle size={18} /></div>
                        <span className="text-2xl font-bold text-card-foreground">{data.approvedCount}</span>
                    </div>
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Approved</div>
                </div>

                <div className="bg-card border border-border p-5 rounded-xl">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-2 bg-destructive/10 text-destructive rounded-md"><AlertOctagon size={18} /></div>
                        <span className="text-2xl font-bold text-card-foreground">{data.flaggedCount}</span>
                    </div>
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Flagged</div>
                </div>
            </section>

            {/* Only render this entire section if there is at least 1 recipe */}
            {data.recentRecipes.length > 0 && (
                <section className="bg-card border border-border rounded-xl">
                    <div className="p-5 border-b border-border flex justify-between items-center">
                        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Recent Additions</h2>
                        <Link href="/owner/recipes" className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                            View Audit Log <ArrowRight size={14} />
                        </Link>
                    </div>

                    <div className="p-2">
                        <div className="flex flex-col">
                            {data.recentRecipes.map((recipe) => (
                                <div key={recipe.id} className="flex justify-between items-center p-3 hover:bg-muted/50 rounded-lg transition-colors">
                                    <span className="text-sm font-medium text-card-foreground">{recipe.meal_name}</span>
                                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border ${
                                        recipe.status === 'APPROVED' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                            recipe.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                'bg-destructive/10 text-destructive border-destructive/20'
                                    }`}>
                            {recipe.status}
                        </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </main>
    );
}