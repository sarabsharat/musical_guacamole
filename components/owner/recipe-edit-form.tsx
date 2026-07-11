"use client";

import { IngredientReference } from "@prisma/client";
import { SessionUser, Recipe, RecipeIngredient, UpdateRecipePayload } from "@/lib/shared-types";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { updateRecipe } from "@/actions/RecipesActions";
import Link from "next/link";
import { generateSafeId, IngredientMapperGrid, LiveMacroPreviewCard, useIngredientMapper } from "@/lib/utils/recipe-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, AlertTriangle } from "lucide-react";

interface RecipeEditFormProps {
    currentUser: SessionUser;
    recipe: Recipe;
    references: IngredientReference[];
}

export function RecipeEditForm({ currentUser, recipe, references }: RecipeEditFormProps) {
    const router = useRouter();

    const [mealName, setMealName] = useState(recipe.meal_name);
    const [preparationNotes, setPreparationNotes] = useState(recipe.preparation_notes);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const initialRows = (Array.isArray(recipe.ingredients) ? recipe.ingredients : []).map((ing: RecipeIngredient) => ({
        keyId: generateSafeId(),
        rawText: ing.ingredient_item?.name || "Active Ingredient",
        userStatedAmount: ing.user_stated_amount || "1 unit",
        normalizedGrams: Number(ing.normalized_grams) || 100,
        selectedIngredientId: Number(ing.ingredient_id) || references[0]?.id || 0,
    }));

    const { rows, updateRowField, removeRow, addManualRow, livePreview } = useIngredientMapper(initialRows, references);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!mealName.trim()) return setError("Please specify a meal name.");
        if (rows.length === 0) return setError("Please include at least one ingredient.");

        setLoading(true);
        setError(null);

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

        const res = await updateRecipe(currentUser, recipe.id, payload);
        setLoading(false);

        if (res.success) {
            router.push(`/recipes/${recipe.id}`);
        } else {
            setError(res.message);
        }
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="mx-auto max-w-5xl">
                {/* Breadcrumb */}
                <div className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Link href={`/recipes/${recipe.id}`} className="hover:text-foreground transition-colors">
                        Back to File
                    </Link>
                    <span>/</span>
                    <span>Adjust Recipe: {recipe.meal_name}</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Warning Alert */}
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Re-Verification Required</AlertTitle>
                            <AlertDescription>
                                Saving your changes will submit the recipe for digital audit queue re-verification.
                            </AlertDescription>
                        </Alert>

                        {/* Macro Preview */}
                        <LiveMacroPreviewCard preview={livePreview} />
                    </div>

                    {/* Main Form */}
                    <div className="lg:col-span-2">
                        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Error Alert */}
                                {error && (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle>Error</AlertTitle>
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                )}

                                {/* Meal Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="meal-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Meal Name
                                    </Label>
                                    <Input
                                        id="meal-name"
                                        required
                                        type="text"
                                        value={mealName}
                                        onChange={(e) => setMealName(e.target.value)}
                                        className="bg-background"
                                    />
                                </div>

                                {/* Preparation Notes */}
                                <div className="space-y-2">
                                    <Label htmlFor="prep-notes" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Preparation Notes
                                    </Label>
                                    <Textarea
                                        id="prep-notes"
                                        required
                                        rows={4}
                                        value={preparationNotes}
                                        onChange={(e) => setPreparationNotes(e.target.value)}
                                        className="resize-none bg-background"
                                    />
                                </div>

                                {/* Ingredients Grid */}
                                <IngredientMapperGrid
                                    rows={rows}
                                    references={references}
                                    onUpdate={updateRowField}
                                    onRemove={removeRow}
                                    onAdd={addManualRow}
                                />

                                {/* Action Buttons */}
                                <div className="flex gap-3 border-t pt-6">
                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        size="lg"
                                        className="flex-1 uppercase font-semibold"
                                        variant="default"
                                    >
                                        {loading ? "Updating..." : "Save Changes & Re-Submit"}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        className="uppercase font-semibold"
                                    >
                                        <Link href={`/recipes/${recipe.id}`}>Cancel</Link>
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}