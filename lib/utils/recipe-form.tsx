"use client";

import React, { useMemo, useState } from "react";
import { IngredientReference } from "@prisma/client";
import { IngredientRow } from "@/lib/shared-types";
import { calculatePreview, LivePreview } from "@/lib/utils/recipe-utils";
import { SearchableIngredientSelect } from "@/components/shared/searchable-ingredient-select";

// FIX: Safe ID Generator replaces crypto.randomUUID() to avoid Node/Browser UMD global errors
export const generateSafeId = () => Math.random().toString(36).substring(2, 11);

// --- SHARED HOOK ---
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

// --- SHARED UI: MACRO CARD ---
export function LiveMacroPreviewCard({ preview }: { preview: LivePreview }) {
    return (
        <div className="border-4 border-black p-4 bg-black text-white rounded-none">
        <h3 className="  text-sm font-bold uppercase border-b border-white pb-2 mb-3">
            Recalculation Ledger
    </h3>
    <div className="grid grid-cols-2 gap-4   text-center">
    <div className="border border-white p-2 bg-neutral-900">
    <div className="text-[10px] uppercase text-neutral-400">Calories</div>
        <div className="text-lg font-extrabold">{preview.calories} kcal</div>
    </div>
    <div className="border border-white p-2 bg-neutral-900">
    <div className="text-[10px] uppercase text-neutral-400">Protein</div>
        <div className="text-lg font-extrabold">{preview.protein}g</div>
    </div>
    <div className="border border-white p-2 bg-neutral-900">
    <div className="text-[10px] uppercase text-neutral-400">Carbs</div>
        <div className="text-lg font-extrabold">{preview.carbs}g</div>
    </div>
    <div className="border border-white p-2 bg-neutral-900">
    <div className="text-[10px] uppercase text-neutral-400">Total Fat</div>
    <div className="text-lg font-extrabold">{preview.fat}g</div>
    </div>
    </div>
    <div className="mt-4 border-t border-neutral-700 pt-3  ">
    <div className="text-xs uppercase font-bold text-red-400">Aggregated Allergens:</div>
    <div className="mt-1 flex flex-wrap gap-1">
        {preview.allergens.size === 0 ? (
                <span className="text-[10px] text-neutral-400 italic">None identified.</span>
) : (
        Array.from(preview.allergens).map((allergen) => (
            <span key={allergen} className="bg-red-500 text-white text-[10px] font-bold uppercase px-2 py-0.5 border border-white">
        {allergen}
        </span>
))
)}
    </div>
    </div>
    </div>
);
}

// --- SHARED UI: INGREDIENT GRID ---
interface IngredientGridProps {
    rows: IngredientRow[];
    references: IngredientReference[];
    onUpdate: (keyId: string, field: keyof IngredientRow, value: string | number) => void;
    onRemove: (keyId: string) => void;
    onAdd: () => void;
}

export function IngredientMapperGrid({ rows, references, onUpdate, onRemove, onAdd }: IngredientGridProps) {
    return (
        <div className="space-y-4">
        <div className="flex justify-between items-center border-b-2 border-black pb-2">
        <label className="block   text-sm font-bold uppercase">
            AI Extracted / Mapped Ingredients
    </label>
    <button
    type="button"
    onClick={onAdd}
    className="bg-black text-white px-3 py-1   text-xs font-bold uppercase rounded-none border border-black hover:bg-neutral-800"
        >
        + Add Ingredient
    </button>
    </div>
    <div className="space-y-4">
        {rows.map((row) => (
                <div key={row.keyId} className="border-2 border-black p-4 bg-white rounded-none grid grid-cols-1 md:grid-cols-12 gap-3 items-end relative">
            <button type="button" onClick={() => onRemove(row.keyId)} className="absolute top-2 right-2 border border-black bg-red-100 hover:bg-red-500 hover:text-white px-1   text-[10px] font-bold rounded-none">
        X
        </button>
        <div className="md:col-span-3">
    <div className="text-[10px]   uppercase text-neutral-400">Extracted Text / Name</div>
    <input
    required
    type="text"
    value={row.rawText}
    onChange={(e) => onUpdate(row.keyId, "rawText", e.target.value)}
    className="w-full border border-black p-1.5   text-xs rounded-none focus:outline-none mt-1 bg-neutral-50"
        />
        </div>
        <div className="md:col-span-2">
    <div className="text-[10px]   uppercase text-neutral-400">Stated Amount</div>
    <input
    type="text"
    value={row.userStatedAmount}
    onChange={(e) => onUpdate(row.keyId, "userStatedAmount", e.target.value)}
    className="w-full border border-black p-1.5   text-xs rounded-none focus:outline-none mt-1"
        />
        </div>
        <div className="md:col-span-2">
    <div className="text-[10px]   uppercase text-neutral-400">Weight (g)</div>
        <input
    required
    type="number"
    min={0.1}
    step={0.1}
    value={row.normalizedGrams}
    onChange={(e) => onUpdate(row.keyId, "normalizedGrams", parseFloat(e.target.value) || 0)}
    className="w-full border border-black p-1.5   text-xs rounded-none focus:outline-none mt-1"
        />
        </div>
        <div className="md:col-span-5">
    <div className="text-[10px]   uppercase text-neutral-400">Reference Database Mapping</div>
    <SearchableIngredientSelect
    ingredients={references}
    value={row.selectedIngredientId}
    onChange={(id) => onUpdate(row.keyId, "selectedIngredientId", id)}
    placeholder="Search ingredient..."
    className="w-full"
        />
        </div>
        </div>
))}
    </div>
    </div>
);
}