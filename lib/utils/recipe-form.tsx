"use client";

import React, { useMemo, useState } from "react";
import { IngredientReference } from "@prisma/client";
import { IngredientRow } from "@/lib/shared-types";
import { calculatePreview, LivePreview } from "@/lib/utils/recipe-utils";
import { SearchableIngredientSelect } from "@/components/shared/searchable-ingredient-select";
import { Trash2, Plus } from "lucide-react";

// ═══════════════════════════════════════════════════════════════
// 1. UTILS & HOOKS (Fixes TS2305 and TS2724)
// ═══════════════════════════════════════════════════════════════

export const generateSafeId = () => Math.random().toString(36).substring(2, 11);

export function useIngredientMapper(initialRows: IngredientRow[], references: IngredientReference[]) {
    const [rows, setRows] = useState<IngredientRow[]>(initialRows);

    const updateRowField = (keyId: string, field: keyof IngredientRow, value: string | number) => {
        setRows((prev) => prev.map((row) => (row.keyId === keyId ? { ...row, [field]: value } : row)));
    };

    const removeRow = (keyId: string) => {
        setRows((prev) => prev.filter((row) => row.keyId !== keyId));
    };

    const addManualRow = () => {
        setRows((prev) => [
            ...prev,
            {
                keyId: generateSafeId(),
                rawText: "Manual Ingredient Addition",
                userStatedAmount: "50g",
                normalizedGrams: 50,
                selectedIngredientId: references[0]?.id || 0,
            },
        ]);
    };

    const livePreview = useMemo(() => calculatePreview(rows, references), [rows, references]);

    return { rows, setRows, updateRowField, removeRow, addManualRow, livePreview };
}

// ═══════════════════════════════════════════════════════════════
// 2. UI COMPONENTS (SaaS-Native Design)
// ═══════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════
// 3. STRICT INTERFACES (Fixes ESLint 'any' errors)
// ═══════════════════════════════════════════════════════════════

export interface IngredientGridProps {
    rows: IngredientRow[];
    references: IngredientReference[];
    onUpdate: (keyId: string, field: keyof IngredientRow, value: string | number) => void;
    onRemove: (keyId: string) => void;
    onAdd: () => void;
}

export function IngredientMapperGrid({ rows, references, onUpdate, onRemove, onAdd }: IngredientGridProps) {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <label className="text-sm font-bold uppercase tracking-wider">Mapping Registry</label>
                <button
                    type="button"
                    onClick={onAdd}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 text-xs font-bold uppercase rounded-lg hover:brightness-110 transition-all"
                >
                    <Plus size={14} /> Add Ingredient
                </button>
            </div>

            <div className="space-y-3">
                {rows.map((row: IngredientRow) => (
                    <div key={row.keyId} className="group relative bg-card border border-border p-4 rounded-xl hover:border-primary/50 transition-colors grid grid-cols-1 md:grid-cols-12 gap-4 items-center">

                        <div className="md:col-span-4">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">AI Extracted Name</label>
                            <input
                                value={row.rawText}
                                onChange={(e) => onUpdate(row.keyId, "rawText", e.target.value)}
                                className="w-full bg-background border border-border rounded-lg p-2.5 text-sm focus:border-primary outline-none transition-all"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Amount</label>
                            <input
                                value={row.userStatedAmount}
                                onChange={(e) => onUpdate(row.keyId, "userStatedAmount", e.target.value)}
                                className="w-full bg-background border border-border rounded-lg p-2.5 text-sm focus:border-primary outline-none transition-all"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Weight (g)</label>
                            <input
                                type="number"
                                value={row.normalizedGrams}
                                onChange={(e) => onUpdate(row.keyId, "normalizedGrams", parseFloat(e.target.value) || 0)}
                                className="w-full bg-background border border-border rounded-lg p-2.5 text-sm focus:border-primary outline-none transition-all"
                            />
                        </div>

                        <div className="md:col-span-3">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Database Ref</label>
                            <SearchableIngredientSelect
                                ingredients={references}
                                value={row.selectedIngredientId}
                                onChange={(id) => onUpdate(row.keyId, "selectedIngredientId", id)}
                                placeholder="Select..."
                            />
                        </div>

                        <button
                            type="button"
                            onClick={() => onRemove(row.keyId)}
                            className="absolute -right-3 -top-3 p-1.5 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}