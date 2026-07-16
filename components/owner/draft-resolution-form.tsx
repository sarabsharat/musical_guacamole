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

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-border pb-6">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tight text-primary">Review Draft #{draft.id}</h1>
                </div>

                <Button
                    onClick={handleRunAI}
                    disabled={aiLoading}
                    size="lg"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground uppercase font-bold tracking-wider"
                >
                    {aiLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Auto-Fill with AI
                </Button>
            </div>

            {/* 5. Escaped entities: "Chef's Notes" -> "Chef&apos;s Notes" */}
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Chef&apos;s Notes
            </p>

            {aiError && (
                <Alert className="border-destructive/50 bg-destructive/10 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Extraction Error</AlertTitle>
                    <AlertDescription>{aiError}</AlertDescription>
                </Alert>
            )}

            <div className="border border-primary/20 rounded-xl overflow-hidden shadow-2xl">
                <LiveMacroPreviewCard preview={livePreview} />
            </div>

            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                <IngredientMapperGrid
                    rows={rows}
                    references={references}
                    onUpdate={updateRowField}
                    onRemove={removeRow}
                    onAdd={addManualRow}
                />
            </div>

            <Button
                onClick={handleApprove}
                disabled={loading}
                size="lg"
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 uppercase font-black text-base tracking-widest py-8 shadow-lg"
            >
                {loading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                    "Approve Match & Create Recipe"
                )}
            </Button>
        </div>
    );
}