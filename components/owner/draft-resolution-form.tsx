"use client";

import React, { useState, useEffect } from "react";
import { resolveDraftToRecipe } from "@/actions/owner-drafts";
import { SessionUser } from "@/lib/security";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface IngredientReference {
    id: number;
    name: string;
    calories_per_g: number;
    protein_per_g: number;
    carbs_per_g: number;
    fat_per_g: number;
    allergens: string[];
}

interface ExtractedItem {
    raw_text: string;
    stated_amount: string;
    calculated_grams: number;
    resolved_ingredient_id: number | null;
}

interface RecipeDraft {
    id: number;
    raw_input_text: string;
    image_url: string | null;
    extracted_json: any; // Raw JSON payload
}

interface FormProps {
    currentUser: SessionUser;
    draft: RecipeDraft;
    references: IngredientReference[];
}

interface FormIngredientRow {
    keyId: string; // Unique UI key
    rawText: string;
    userStatedAmount: string;
    normalizedGrams: number;
    selectedIngredientId: number; // Linked DB Reference ID
}

export function DraftResolutionForm({ currentUser, draft, references }: FormProps) {
    const router = useRouter();
    const [mealName, setMealName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize form rows from AI structured JSON
    const [rows, setRows] = useState<FormIngredientRow[]>([]);

    useEffect(() => {
        // Safely parse LLM output list from draft
        const parsedExtracted: ExtractedItem[] = Array.isArray(draft.extracted_json)
            ? draft.extracted_json
            : [];

        const initialRows = parsedExtracted.map((item, idx) => {
            // Find fallback match if resolver set matched id
            const resolvedId = item.resolved_ingredient_id || references[0]?.id || 0;

            return {
                keyId: `${idx}-${Date.now()}`,
                rawText: item.raw_text,
                userStatedAmount: item.stated_amount || "1 unit",
                normalizedGrams: item.calculated_grams || 100,
                selectedIngredientId: resolvedId,
            };
        });

        setRows(initialRows);
    }, [draft.extracted_json, references]);

    // UI state mutators
    const updateRowField = (keyId: string, field: keyof FormIngredientRow, value: any) => {
        setRows((prev) =>
            prev.map((row) => (row.keyId === keyId ? { ...row, [field]: value } : row))
        );
    };

    const removeRow = (keyId: string) => {
        setRows((prev) => prev.filter((row) => row.keyId !== keyId));
    };

    const addManualRow = () => {
        const fallbackId = references[0]?.id || 0;
        setRows((prev) => [
            ...prev,
            {
                keyId: `manual-${Date.now()}`,
                rawText: "Manual Ingredient Addition",
                userStatedAmount: "50g",
                normalizedGrams: 50,
                selectedIngredientId: fallbackId,
            },
        ]);
    };

    // Live Recalculation preview calculations (Pre-resolution UI feedback)
    const [livePreview, setLivePreview] = useState({
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        allergens: new Set<string>(),
    });

    useEffect(() => {
        let caloriesSum = 0;
        let proteinSum = 0;
        let carbsSum = 0;
        let fatSum = 0;
        const allergensSet = new Set<string>();

        const refMap = new Map(references.map((r) => [r.id, r]));

        for (const row of rows) {
            const ref = refMap.get(row.selectedIngredientId);
            if (ref) {
                const grams = Number(row.normalizedGrams) || 0;
                caloriesSum += ref.calories_per_g * grams;
                proteinSum += ref.protein_per_g * grams;
                carbsSum += ref.carbs_per_g * grams;
                fatSum += ref.fat_per_g * grams;

                if (ref.allergens && ref.allergens.length > 0) {
                    ref.allergens.forEach((a) => allergensSet.add(a));
                }
            }
        }

        setLivePreview({
            calories: parseFloat(caloriesSum.toFixed(1)),
            protein: parseFloat(proteinSum.toFixed(1)),
            carbs: parseFloat(carbsSum.toFixed(1)),
            fat: parseFloat(fatSum.toFixed(1)),
            allergens: allergensSet,
        });
    }, [rows, references]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mealName.trim()) {
            setError("Please specify an official meal name for compliance publishing.");
            return;
        }
        if (rows.length === 0) {
            setError("Please include at least one mapped ingredient.");
            return;
        }

        setLoading(true);
        setError(null);

        const payload = {
            draft_id: draft.id,
            meal_name: mealName,
            ingredients: rows.map((row) => ({
                ingredient_id: row.selectedIngredientId,
                user_stated_amount: row.userStatedAmount,
                normalized_grams: row.normalizedGrams,
            })),
        };

        const res = await resolveDraftToRecipe(currentUser, payload);

        setLoading(false);

        if (res.success) {
            router.push("/owner/recipes");
        } else {
            setError(res.message);
        }
    };

    return (
        <div className="mx-auto max-w-5xl border-4 border-black bg-white p-6 rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">

            {/* Navigation Breadcrumb */}
            <div className="mb-6 font-mono text-xs uppercase flex space-x-2 border-b-2 border-black pb-2">
                <Link href="/owner/drafts" className="underline hover:text-red-500">Ingestion Queue</Link>
                <span>/</span>
                <span className="text-neutral-500">Resolution Console #{draft.id}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Context Details */}
                <div className="lg:col-span-1 space-y-6">

                    <div className="border-4 border-black p-4 bg-yellow-50 rounded-none">
                        <h3 className="font-mono text-sm font-bold uppercase border-b-2 border-black pb-1 mb-2">
                            Raw Dictation Notes
                        </h3>
                        <p className="font-mono text-xs italic text-neutral-800 leading-relaxed bg-white p-3 border border-neutral-300">
                            &ldquo;{draft.raw_input_text}&rdquo;
                        </p>
                    </div>

                    {draft.image_url && (
                        <div className="border-4 border-black p-2 bg-neutral-50 rounded-none">
                            <h4 className="font-mono text-xs font-bold uppercase mb-2">Ingested Visual Reference</h4>
                            <div className="w-full h-48 border-2 border-black overflow-hidden relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={draft.image_url}
                                    alt="Raw recipe visual upload"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                    )}

                    {/* Recalculation Ledger Preview Card */}
                    <div className="border-4 border-black p-4 bg-black text-white rounded-none">
                        <h3 className="font-mono text-sm font-bold uppercase border-b border-white pb-2 mb-3">
                            Recalculation Ledger
                        </h3>
                        <div className="grid grid-cols-2 gap-4 font-mono text-center">
                            <div className="border border-white p-2 bg-neutral-900">
                                <div className="text-[10px] uppercase text-neutral-400">Calories</div>
                                <div className="text-lg font-extrabold">{livePreview.calories} kcal</div>
                            </div>
                            <div className="border border-white p-2 bg-neutral-900">
                                <div className="text-[10px] uppercase text-neutral-400">Protein</div>
                                <div className="text-lg font-extrabold">{livePreview.protein}g</div>
                            </div>
                            <div className="border border-white p-2 bg-neutral-900">
                                <div className="text-[10px] uppercase text-neutral-400">Carbs</div>
                                <div className="text-lg font-extrabold">{livePreview.carbs}g</div>
                            </div>
                            <div className="border border-white p-2 bg-neutral-900">
                                <div className="text-[10px] uppercase text-neutral-400">Total Fat</div>
                                <div className="text-lg font-extrabold">{livePreview.fat}g</div>
                            </div>
                        </div>

                        <div className="mt-4 border-t border-neutral-700 pt-3 font-mono">
                            <div className="text-xs uppercase font-bold text-red-400">Aggregated Allergens:</div>
                            <div className="mt-1 flex flex-wrap gap-1">
                                {livePreview.allergens.size === 0 ? (
                                    <span className="text-[10px] text-neutral-400 italic">None identified.</span>
                                ) : (
                                    Array.from(livePreview.allergens).map((allergen) => (
                                        <span
                                            key={allergen}
                                            className="bg-red-500 text-white text-[10px] font-bold uppercase px-2 py-0.5 border border-white"
                                        >
                      {allergen}
                    </span>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                </div>

                {/* Right Column: Dynamic Ingredient Resolution Mapper Form */}
                <div className="lg:col-span-2 space-y-6">

                    <form onSubmit={handleSubmit} className="space-y-6">

                        {error && (
                            <div className="border-4 border-red-600 bg-red-50 p-4 font-mono text-xs uppercase text-red-700 rounded-none">
                                <span className="font-bold">Error:</span> {error}
                            </div>
                        )}

                        {/* Meal Label Ingestion */}
                        <div className="space-y-2">
                            <label className="block font-mono text-sm font-bold uppercase">
                                Compliance Meal Name Label
                            </label>
                            <input
                                required
                                type="text"
                                value={mealName}
                                onChange={(e) => setMealName(e.target.value)}
                                placeholder="e.g. Al-Quds Amman Kmaj Breakfast Combo"
                                className="w-full border-4 border-black p-3 font-mono text-xs rounded-none focus:outline-none focus:bg-neutral-50"
                            />
                        </div>

                        {/* Ingredient Grid Mapper */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b-2 border-black pb-2">
                                <label className="block font-mono text-sm font-bold uppercase">
                                    AI Extracted Ingredient Alignments
                                </label>
                                <button
                                    type="button"
                                    onClick={addManualRow}
                                    className="bg-black text-white px-3 py-1 font-mono text-xs font-bold uppercase rounded-none border border-black hover:bg-neutral-800"
                                >
                                    + Add Ingredient
                                </button>
                            </div>

                            <div className="space-y-4">
                                {rows.map((row) => (
                                    <div
                                        key={row.keyId}
                                        className="border-2 border-black p-4 bg-white rounded-none grid grid-cols-1 md:grid-cols-12 gap-3 items-end relative"
                                    >
                                        {/* Delete row wrapper */}
                                        <button
                                            type="button"
                                            onClick={() => removeRow(row.keyId)}
                                            className="absolute top-2 right-2 border border-black bg-red-100 hover:bg-red-500 hover:text-white px-1 font-mono text-[10px] font-bold rounded-none"
                                        >
                                            X
                                        </button>

                                        {/* Extracted Context Source Info */}
                                        <div className="md:col-span-3">
                                            <div className="text-[10px] font-mono uppercase text-neutral-400">Extracted Text</div>
                                            <div className="font-mono text-xs font-bold truncate mt-1">
                                                &ldquo;{row.rawText}&rdquo;
                                            </div>
                                        </div>

                                        {/* Stated amount identifier */}
                                        <div className="md:col-span-2">
                                            <div className="text-[10px] font-mono uppercase text-neutral-400">Stated Amount</div>
                                            <input
                                                type="text"
                                                value={row.userStatedAmount}
                                                onChange={(e) => updateRowField(row.keyId, "userStatedAmount", e.target.value)}
                                                className="w-full border border-black p-1.5 font-mono text-xs rounded-none focus:outline-none mt-1"
                                            />
                                        </div>

                                        {/* Verified base gram weights input */}
                                        <div className="md:col-span-2">
                                            <div className="text-[10px] font-mono uppercase text-neutral-400">Normalized Weight (g)</div>
                                            <input
                                                required
                                                type="number"
                                                min={0.1}
                                                step={0.1}
                                                value={row.normalizedGrams}
                                                onChange={(e) =>
                                                    updateRowField(row.keyId, "normalizedGrams", parseFloat(e.target.value) || 0)
                                                }
                                                className="w-full border border-black p-1.5 font-mono text-xs rounded-none focus:outline-none mt-1"
                                            />
                                        </div>

                                        {/* Reference Library Match Mapping Selection */}
                                        <div className="md:col-span-5">
                                            <div className="text-[10px] font-mono uppercase text-neutral-400">Reference Database Mapping</div>
                                            <select
                                                value={row.selectedIngredientId}
                                                onChange={(e) =>
                                                    updateRowField(row.keyId, "selectedIngredientId", parseInt(e.target.value, 10))
                                                }
                                                className="w-full border border-black p-1.5 font-mono text-xs rounded-none bg-white focus:outline-none mt-1"
                                            >
                                                {references.map((ref) => (
                                                    <option key={ref.id} value={ref.id}>
                                                        {ref.name} ({ref.calories_per_g} kcal/g)
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Submission Actions */}
                        <div className="flex gap-4 pt-4 border-t-4 border-black">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 bg-green-500 hover:bg-green-600 text-black py-3 font-mono text-sm font-bold uppercase border-2 border-black rounded-none active:translate-x-1 active:translate-y-1 disabled:opacity-45 transition"
                            >
                                {loading ? "Publishing compliance metrics..." : "Approve Math & Publish Recipe"}
                            </button>
                            <Link
                                href="/owner/drafts"
                                className="bg-white border-2 border-black text-black px-6 py-3 font-mono text-sm font-bold uppercase rounded-none hover:bg-neutral-50 flex items-center justify-center"
                            >
                                Cancel
                            </Link>
                        </div>

                    </form>

                </div>

            </div>

        </div>
    );
}