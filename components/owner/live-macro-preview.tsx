// components/owner/live-macro-preview-card.tsx
"use client";

import React from "react";
import { LivePreview } from "@/lib/utils/recipe-utils";

export function LiveMacroPreviewCard({ preview }: { preview: LivePreview }) {
    return (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-6">
                Real-time Analysis
            </h3>
            <div className="grid grid-cols-2 gap-4">
                {[
                    { label: "Calories", value: `${preview.calories} kcal` },
                    { label: "Protein", value: `${preview.protein}g` },
                    { label: "Carbs", value: `${preview.carbs}g` },
                    { label: "Fat", value: `${preview.fat}g` },
                ].map((stat) => (
                    <div key={stat.label} className="bg-background p-4 rounded-lg border border-border">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">{stat.label}</div>
                        <div className="text-lg font-bold text-primary">{stat.value}</div>
                    </div>
                ))}
            </div>

            <div className="mt-6 pt-6 border-t border-border">
                <div className="text-xs font-bold text-muted-foreground uppercase mb-3">Allergens</div>
                <div className="flex flex-wrap gap-2">
                    {preview.allergens.size === 0 ? (
                        <span className="text-xs text-muted-foreground italic">None detected</span>
                    ) : (
                        Array.from(preview.allergens).map((allergen) => (
                            <span key={allergen} className="bg-primary/10 text-primary text-[10px] font-bold px-3 py-1 rounded-full border border-primary/20">
                                {allergen}
                            </span>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}