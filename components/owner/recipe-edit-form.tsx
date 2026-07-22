"use client";

import { IngredientReference } from "@prisma/client";
import { Recipe, RecipeIngredient, UpdateRecipePayload } from "@/lib/shared-types";
import { useRouter } from "next/navigation";
import React, { useState, useMemo } from "react";
import { updateRecipe } from "@/actions/RecipesActions";
import Link from "next/link";
import { generateSafeId, LiveMacroPreviewCard, useIngredientMapper } from "@/lib/utils/recipe-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ArrowLeft, Loader2, MessageSquareWarning } from "lucide-react";
import {IngredientMapperGrid} from "@/components/owner/ingredients-mapper-grid";

interface RecipeEditFormProps {
    recipe: Recipe;
    references: IngredientReference[];
    hasPendingClarifications?: boolean;
}

export function RecipeEditForm({ recipe, references, hasPendingClarifications = false }: RecipeEditFormProps) {
    const router = useRouter();
    const [mealName, setMealName] = useState(recipe.meal_name);
    const [preparationNotes, setPreparationNotes] = useState(recipe.preparation_notes);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const initialRows = (Array.isArray(recipe.ingredients) ? recipe.ingredients : []).map((ing: RecipeIngredient) => ({
        keyId: generateSafeId(),
        rawText: ing.ingredient_item?.name || "Unknown Ingredient",
        userStatedAmount: ing.user_stated_amount || "",
        normalizedGrams: Number(ing.normalized_grams) || 0,
        selectedIngredientId: Number(ing.ingredient_id) || references[0]?.id || 0,
    }));

    const { rows, updateRowField, removeRow, addManualRow, livePreview } = useIngredientMapper(initialRows, references);

    // ─── Check if ingredients changed ───────────────────────────────
    const ingredientsChanged = useMemo(() => {
        if (initialRows.length !== rows.length) return true;
        for (let i = 0; i < initialRows.length; i++) {
            const a = initialRows[i];
            const b = rows[i];
            if (
                a.rawText !== b.rawText ||
                a.selectedIngredientId !== b.selectedIngredientId ||
                a.userStatedAmount !== b.userStatedAmount ||
                a.normalizedGrams !== b.normalizedGrams
            ) {
                return true;
            }
        }
        return false;
    }, [initialRows, rows]);

    // ─── Determine if submit should be disabled ──────────────────────
    const isSubmitDisabled = loading || (hasPendingClarifications && !ingredientsChanged);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);

        if (!mealName.trim()) {
            setError("Please enter a meal name.");
            return;
        }

        if (rows.length === 0) {
            setError("Please add at least one ingredient.");
            return;
        }

        // Additional guard: if there are pending clarifications and no ingredient changes, block.
        if (hasPendingClarifications && !ingredientsChanged) {
            setError("You must modify the ingredients to resubmit this recipe.");
            return;
        }

        setLoading(true);

        const payload: UpdateRecipePayload = {
            meal_name: mealName,
            preparation_notes: preparationNotes,
            image_url: recipe.image_url || "",
            ingredients: rows.map((row) => ({
                ingredient_id: row.selectedIngredientId,
                user_stated_amount: row.userStatedAmount,
                normalized_grams: row.normalizedGrams,
            })),
        };

        const res = await updateRecipe(recipe.id, payload);
        setLoading(false);

        if (res.success) {
            router.push(`/owner/recipes/${recipe.id}`);
        } else {
            setError(res.message || "Failed to save changes.");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 px-4 lg:px-6 py-4">
            <div className="mx-auto w-full max-w-6xl space-y-6">
                {/* Breadcrumb & Header */}
                <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <Link
                            href={`/owner/recipes/${recipe.id}`}
                            className="flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </Link>
                        <span>/</span>
                        <span>Edit Recipe</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Edit Recipe</h1>
                    <p className="text-muted-foreground mt-1">{recipe.meal_name}</p>
                </div>

                {/* ─── Pending Clarifications Alert ───────────────────── */}
                {hasPendingClarifications && (
                    <Alert className="border-carbs/30 bg-carbs/10 text-foreground">
                        <MessageSquareWarning className="h-4 w-4 text-carbs" />
                        <AlertTitle className="text-sm font-semibold">Pending Clarifications</AlertTitle>
                        <AlertDescription className="text-xs text-muted-foreground">
                            {ingredientsChanged
                                ? "You have changed the ingredients. You can now resubmit this recipe."
                                : "You must modify the ingredients to resubmit this recipe and clear the clarifications."}
                        </AlertDescription>
                    </Alert>
                )}

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card className="border-border">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold">Recipe Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div>
                                    <p className="text-xs font-bold uppercase text-muted-foreground">Created</p>
                                    <p className="mt-1">{new Date(recipe.created_at).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase text-muted-foreground">Status</p>
                                    <p className="mt-1 capitalize">{recipe.status || "Unknown"}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase text-muted-foreground">Ingredients</p>
                                    <p className="mt-1">{rows.length} items</p>
                                </div>
                            </CardContent>
                        </Card>

                        <LiveMacroPreviewCard preview={livePreview} />

                        <Alert className="border-accent/30 bg-accent/10 text-foreground">
                            <AlertCircle className="h-4 w-4 text-accent" />
                            <AlertTitle className="text-sm font-semibold">Before you save</AlertTitle>
                            <AlertDescription className="text-xs text-muted-foreground">
                                Changes will be submitted for re‑verification by our audit team.
                            </AlertDescription>
                        </Alert>
                    </div>

                    {/* Right side – form */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base font-semibold">Recipe Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="meal-name" className="text-sm font-semibold">
                                        Meal Name
                                    </Label>
                                    <Input
                                        id="meal-name"
                                        type="text"
                                        value={mealName}
                                        onChange={(e) => setMealName(e.target.value)}
                                        className="bg-background"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="prep-notes" className="text-sm font-semibold">
                                        Preparation Notes
                                    </Label>
                                    <Textarea
                                        id="prep-notes"
                                        value={preparationNotes}
                                        onChange={(e) => setPreparationNotes(e.target.value)}
                                        rows={4}
                                        className="resize-none bg-background"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base font-semibold">Ingredients</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <IngredientMapperGrid
                                    rows={rows}
                                    references={references}
                                    onUpdate={updateRowField}
                                    onRemove={removeRow}
                                    onAdd={addManualRow}
                                />
                            </CardContent>
                        </Card>

                        <div className="flex flex-col sm:flex-row gap-3 border-t border-border pt-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                                disabled={loading}
                                className="w-full sm:w-auto uppercase font-semibold"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitDisabled}
                                className="w-full sm:flex-1 uppercase font-semibold gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    "Save & Re-Submit"
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
}