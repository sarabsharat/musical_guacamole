"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { resolveDraftToRecipe } from "@/actions/owner-drafts";
import {generateSafeId, IngredientMapperGrid, LiveMacroPreviewCard, useIngredientMapper} from "@/lib/utils/recipe-form";

export function DraftResolutionForm({ currentUser, draft, references }: any) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);

    // 1. Initial load (in case the AI already ran during submission)
    const initialRows = useMemo(() => {
        if (draft.extracted_json && Array.isArray(draft.extracted_json) && draft.extracted_json.length > 0) {
            return draft.extracted_json.map((item: any) => ({
                keyId: generateSafeId(),
                rawText: item.raw_text || "Unknown Ingredient",
                userStatedAmount: item.stated_amount || "",
                normalizedGrams: Number(item.calculated_grams) || 0,
                selectedIngredientId: item.resolved_ingredient_id || 0,
            }));
        }
        return [];
    }, [draft.extracted_json]);

    // 2. Grab setRows from the updated hook!
    const { rows, setRows, updateRowField, removeRow, addManualRow, livePreview } = useIngredientMapper(initialRows, references);

    // 3. THE MISSING LINK: The function that hits your API and updates the screen
    const handleRunAI = async () => {
        setAiLoading(true);
        try {
            const response = await fetch('/api/ai/parse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rawNotes: draft.raw_input_text,
                    imageUrl: draft.image_url
                })
            });

            const json = await response.json();

            if (json.success && json.data) {
                // Format the AI response to match the grid rows
                const newRows = json.data.map((item: any) => ({
                    keyId: generateSafeId(),
                    rawText: item.raw_text || "Unknown Ingredient",
                    userStatedAmount: item.stated_amount || "",
                    normalizedGrams: Number(item.calculated_grams) || 0,
                    selectedIngredientId: item.resolved_ingredient_id || 0,
                }));

                // Inject the data instantly into the UI!
                setRows(newRows);
            } else {
                alert("AI failed to extract ingredients: " + json.error);
            }
        } catch (error) {
            console.error("API Call Failed", error);
            alert("Failed to connect to AI API.");
        } finally {
            setAiLoading(false);
        }
    };

    const handleApprove = async () => {
        setLoading(true);
        const finalizedIngredients = rows.map(row => ({
            resolved_ingredient_id: row.selectedIngredientId,
            stated_amount: row.userStatedAmount,
            calculated_grams: row.normalizedGrams
        }));

        const res = await resolveDraftToRecipe(draft.id, finalizedIngredients);

        if (res.success) {
            router.push(`/owner/recipes`);
        } else {
            alert(res.message);
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header / Image / Notes Section */}
            <div className="border-4 border-black p-6 bg-white">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-black uppercase">Review Draft #{draft.id}</h1>

                    {/* NEW AI TRIGGER BUTTON */}
                    <button
                        onClick={handleRunAI}
                        disabled={aiLoading}
                        className="bg-blue-600 text-white px-4 py-2 font-mono font-bold text-sm uppercase border-2 border-black hover:bg-blue-700 disabled:opacity-50"
                    >
                        {aiLoading ? "Scanning Image & Notes..." : "✨ Auto-Fill with AI"}
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {draft.image_url && (
                        <img src={draft.image_url} alt="Recipe Draft" className="border-2 border-black object-cover h-48 w-full" />
                    )}
                    <div className="border-2 border-black p-4 bg-neutral-50 font-mono text-sm">
                        <span className="font-bold uppercase text-xs text-neutral-500">Chef's Notes:</span>
                        <p className="mt-2">{draft.raw_input_text}</p>
                    </div>
                </div>
            </div>

            <LiveMacroPreviewCard preview={livePreview} />

            <IngredientMapperGrid
                rows={rows}
                references={references}
                onUpdate={updateRowField}
                onRemove={removeRow}
                onAdd={addManualRow}
            />

            <button
                onClick={handleApprove}
                disabled={loading}
                className="w-full bg-black text-white p-4 font-mono font-bold text-lg uppercase border-4 border-black hover:bg-neutral-800 disabled:opacity-50"
            >
                {loading ? "Saving to Database..." : "Approve Match & Create Recipe"}
            </button>
        </div>
    );
}