"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { resolveDraftToRecipe } from "@/actions/DraftsActions";
import { generateSafeId, IngredientMapperGrid, LiveMacroPreviewCard, useIngredientMapper } from "@/lib/utils/recipe-form";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Sparkles, AlertCircle } from "lucide-react";

export function DraftResolutionForm({ currentUser, draft, references }: any) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    // Initial load
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

    const { rows, setRows, updateRowField, removeRow, addManualRow, livePreview } = useIngredientMapper(initialRows, references);

    // Run AI extraction
    const handleRunAI = async () => {
        setAiLoading(true);
        setAiError(null);
        try {
            const response = await fetch("/api/ai/parse", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    rawNotes: draft.raw_input_text,
                    imageUrl: draft.image_url,
                }),
            });

            const json = await response.json();

            if (json.success && json.data) {
                const newRows = json.data.map((item: any) => ({
                    keyId: generateSafeId(),
                    rawText: item.raw_text || "Unknown Ingredient",
                    userStatedAmount: item.stated_amount || "",
                    normalizedGrams: Number(item.calculated_grams) || 0,
                    selectedIngredientId: item.resolved_ingredient_id || 0,
                }));

                setRows(newRows);
            } else {
                setAiError(json.error || "AI failed to extract ingredients.");
            }
        } catch (error) {
            console.error("API Call Failed", error);
            setAiError("Failed to connect to AI API.");
        } finally {
            setAiLoading(false);
        }
    };

    // Approve and create recipe
    const handleApprove = async () => {
        setLoading(true);
        const finalizedIngredients = rows.map((row) => ({
            resolved_ingredient_id: row.selectedIngredientId,
            stated_amount: row.userStatedAmount,
            calculated_grams: row.normalizedGrams,
        }));

        const res = await resolveDraftToRecipe(draft.id, finalizedIngredients);

        if (res.success) {
            router.push("/owner/recipes");
        } else {
            setAiError(res.message || "Failed to create recipe.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="mx-auto max-w-5xl space-y-6">
                {/* Header and Image Section */}
                <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
                    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-2xl font-black uppercase">Review Draft #{draft.id}</h1>
                        </div>

                        {/* AI Trigger Button */}
                        <Button
                            onClick={handleRunAI}
                            disabled={aiLoading}
                            size="lg"
                            variant="secondary"
                            className="gap-2 uppercase font-semibold"
                        >
                            {aiLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Scanning Image & Notes...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4" />
                                    Auto-Fill with AI
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Image and Notes Grid */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {draft.image_url && (
                            <div className="rounded-lg border bg-muted overflow-hidden">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={draft.image_url}
                                    alt="Recipe Draft"
                                    className="h-48 w-full object-cover"
                                />
                            </div>
                        )}
                        <div className="rounded-lg border bg-muted p-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                Chef's Notes
                            </p>
                            <p className="text-sm leading-relaxed">{draft.raw_input_text}</p>
                        </div>
                    </div>
                </div>

                {/* AI Error Alert */}
                {aiError && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{aiError}</AlertDescription>
                    </Alert>
                )}

                {/* Macro Preview */}
                <LiveMacroPreviewCard preview={livePreview} />

                {/* Ingredients Grid */}
                <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
                    <IngredientMapperGrid
                        rows={rows}
                        references={references}
                        onUpdate={updateRowField}
                        onRemove={removeRow}
                        onAdd={addManualRow}
                    />
                </div>

                {/* Final Approval Button */}
                <Button
                    onClick={handleApprove}
                    disabled={loading}
                    size="lg"
                    className="w-full uppercase font-semibold text-base"
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving to Database...
                        </>
                    ) : (
                        "Approve Match & Create Recipe"
                    )}
                </Button>
            </div>
        </div>
    );
}