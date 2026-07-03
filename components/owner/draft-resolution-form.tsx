"use client";

import { IngredientReference } from "@prisma/client";
import { SessionUser, ExtractedItem, RecipeDraft } from "@/lib/shared-types";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { resolveDraftToRecipe } from "@/actions/owner-drafts";
import Link from "next/link";
import {generateSafeId, IngredientMapperGrid, LiveMacroPreviewCard, useIngredientMapper} from "@/lib/utils/recipe-form";


interface DraftResolutionFormProps {
    currentUser: SessionUser;
    draft: RecipeDraft;
    references: IngredientReference[];
}

export function DraftResolutionForm({ draft, references }: DraftResolutionFormProps) {
    const router = useRouter();

    const [mealName, setMealName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Utilize the shared custom hook
    const parsedExtracted: ExtractedItem[] = Array.isArray(draft.extracted_json) ? draft.extracted_json : [];
    const initialRows = parsedExtracted.map((item) => ({
        keyId: generateSafeId(),
        rawText: item.raw_text,
        userStatedAmount: item.stated_amount || "1 unit",
        normalizedGrams: item.calculated_grams || 100,
        selectedIngredientId: item.resolved_ingredient_id || references[0]?.id || 0,
    }));

    const { rows, updateRowField, removeRow, addManualRow, livePreview } = useIngredientMapper(initialRows, references);

    const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!mealName.trim()) return setError("Please specify an official meal name.");
        if (rows.length === 0) return setError("Please include at least one mapped ingredient.");

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

        const res = await resolveDraftToRecipe(null, payload);
        setLoading(false);

        if (res.success) {
            router.push("/owner/recipes");
        } else {
            setError(res.message);
        }
    };

    return (
        <div className="mx-auto max-w-5xl border-4 border-black bg-white p-6 rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="mb-6 font-mono text-xs uppercase flex space-x-2 border-b-2 border-black pb-2">
                <Link href="/owner/drafts" className="underline hover:text-red-500">Ingestion Queue</Link>
                <span>/</span>
                <span className="text-neutral-500">Resolution Console #{draft.id}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <div className="border-4 border-black p-4 bg-yellow-50 rounded-none">
                        <h3 className="font-mono text-sm font-bold uppercase border-b-2 border-black pb-1 mb-2">Raw Dictation Notes</h3>
                        <p className="font-mono text-xs italic text-neutral-800 bg-white p-3 border border-neutral-300">
                            &ldquo;{draft.raw_input_text}&rdquo;
                        </p>
                    </div>

                    {draft.image_url && (
                        <div className="border-4 border-black p-2 bg-neutral-50 rounded-none">
                            <h4 className="font-mono text-xs font-bold uppercase mb-2">Ingested Visual Reference</h4>
                            <div className="w-full h-48 border-2 border-black overflow-hidden relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={draft.image_url} alt="Raw visual upload" className="w-full h-full object-cover" />
                            </div>
                        </div>
                    )}

                    {/* Inject shared UI */}
                    <LiveMacroPreviewCard preview={livePreview} />
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && <div className="border-4 border-red-600 bg-red-50 p-4 font-mono text-xs uppercase text-red-700 rounded-none"><span className="font-bold">Error:</span> {error}</div>}

                        <div className="space-y-2">
                            <label className="block font-mono text-sm font-bold uppercase">Compliance Meal Name Label</label>
                            <input required type="text" value={mealName} onChange={(e) => setMealName(e.target.value)} placeholder="e.g. Breakfast Combo" className="w-full border-4 border-black p-3 font-mono text-xs rounded-none focus:outline-none focus:bg-neutral-50" />
                        </div>

                        {/* Inject shared UI */}
                        <IngredientMapperGrid rows={rows} references={references} onUpdate={updateRowField} onRemove={removeRow} onAdd={addManualRow} />

                        <div className="flex gap-4 pt-4 border-t-4 border-black">
                            <button type="submit" disabled={loading} className="flex-1 bg-green-500 hover:bg-green-600 text-black py-3 font-mono text-sm font-bold uppercase border-2 border-black rounded-none transition">
                                {loading ? "Publishing..." : "Approve Math & Publish"}
                            </button>
                            <Link href="/owner/drafts" className="bg-white border-2 border-black text-black px-6 py-3 font-mono text-sm font-bold uppercase hover:bg-neutral-50 flex items-center justify-center">Cancel</Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}