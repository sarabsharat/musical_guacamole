"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { resolveDraftToRecipe } from "@/actions/DraftsActions";
import { generateSafeId, IngredientMapperGrid, LiveMacroPreviewCard, useIngredientMapper } from "@/lib/utils/recipe-form";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Sparkles, AlertCircle } from "lucide-react";
import { IngredientReference } from "@prisma/client";

// 1. Strict Typing to replace all 'any' types
interface ExtractedItem {
    raw_text?: string;
    stated_amount?: string;
    calculated_grams?: string | number;
    resolved_ingredient_id?: number;
}

interface DraftType {
    id: number;
    raw_input_text: string;
    image_url?: string | null;
    extracted_json?: ExtractedItem[] | null;
}

interface DraftResolutionFormProps {

    draft: DraftType;
    references:  IngredientReference[];
}

export function DraftResolutionForm({ draft, references }: DraftResolutionFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    // 2. initialRows declared BEFORE it is used by the hook
    const initialRows = useMemo(() => {
        if (draft.extracted_json && Array.isArray(draft.extracted_json) && draft.extracted_json.length > 0) {
            return draft.extracted_json.map((item: ExtractedItem) => ({
                keyId: generateSafeId(),
                rawText: item.raw_text || "Unknown Ingredient",
                userStatedAmount: item.stated_amount || "",
                normalizedGrams: Number(item.calculated_grams) || 0,
                selectedIngredientId: item.resolved_ingredient_id || 0,
            }));
        }
        return [];
    }, [draft.extracted_json]);

    // 3. Extracted setRows to satisfy TS2304
    const { rows, setRows, updateRowField, removeRow, addManualRow, livePreview } = useIngredientMapper(initialRows, references);

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
                const newRows = json.data.map((item: ExtractedItem) => ({
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

    const handleApprove = async () => {
        setLoading(true);

        const finalizedIngredients = rows.map((row: any) => ({
            resolved_ingredient_id: row.selectedIngredientId,
            stated_amount: row.userStatedAmount,
            calculated_grams: row.normalizedGrams,
        }));

        const res = await resolveDraftToRecipe({
            draftId: draft.id,
            finalizedIngredients: finalizedIngredients
        });

        if (res.success) {
            // If your action creates the Recipe DB record and returns its ID:
            if (res.recipeId) {
                router.push(`/owner/recipes/${res.recipeId}/edit`);
            }
            // OR: If your action just validates the draft, pass the draft ID to a "new" form:
            else {
                router.push(`/owner/recipes/new?fromDraftId=${draft.id}`);
            }
        } else {
            setAiError(res.message || "Failed to process draft.");
            setLoading(false);
        }
    };

    // components/owner/draft-resolution-form.tsx – full updated JSX
// (the rest of the component (state, handlers, imports) stays the same)

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        Review Draft #{draft.id}
                    </h1>
                    <p className="text-base text-muted-foreground mt-1">
                        Match ingredients and finalize the recipe.
                    </p>
                </div>

                <Button
                    onClick={handleRunAI}
                    disabled={aiLoading}
                    size="lg"
                    className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-lg text-base font-semibold transition-all h-auto"
                >
                    {aiLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <Sparkles className="h-5 w-5" />
                    )}
                    Auto-Fill with AI
                </Button>
            </div>

            {/* Chef's Notes */}
            <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Chef&apos;s Notes
                </p>
                <div className="rounded-xl border border-border bg-muted/20 p-4 text-base text-foreground/80">
                    {draft.raw_input_text}
                </div>
            </div>

            {/* AI Error Alert */}
            {aiError && (
                <Alert variant="destructive" className="border-destructive/50 bg-destructive/10 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    <AlertTitle className="text-base font-semibold">Extraction Error</AlertTitle>
                    <AlertDescription className="text-sm">{aiError}</AlertDescription>
                </Alert>
            )}

            {/* Live Preview Card */}
            <div className="rounded-xl border border-primary/20 bg-card shadow-sm overflow-hidden">
                <LiveMacroPreviewCard preview={livePreview} />
            </div>

            {/* Ingredient Mapper */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <IngredientMapperGrid
                    rows={rows}
                    references={references}
                    onUpdate={updateRowField}
                    onRemove={removeRow}
                    onAdd={addManualRow}
                />
            </div>

            {/* Approve Button */}
            <Button
                onClick={handleApprove}
                disabled={loading}
                size="lg"
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 text-lg font-bold uppercase tracking-wider py-4 shadow-md rounded-xl transition-all h-auto"
            >
                {loading ? (
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                ) : (
                    "Approve Match & Create Recipe"
                )}
            </Button>
        </div>
    );
}