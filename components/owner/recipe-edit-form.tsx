"use client";

import { IngredientReference } from "@prisma/client";
import { Recipe, RecipeIngredient, UpdateRecipePayload } from "@/lib/shared-types";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";

interface RecipeEditFormProps {
    currentUser: unknown;
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
        rawText: ing.ingredient_item?.name || "Unknown Ingredient",
        userStatedAmount: ing.user_stated_amount || "",
        normalizedGrams: Number(ing.normalized_grams) || 0,
        selectedIngredientId: Number(ing.ingredient_id) || references[0]?.id || 0,
    }));

    const { rows, updateRowField, removeRow, addManualRow, livePreview } = useIngredientMapper(initialRows, references);

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

        const res = await updateRecipe(currentUser, recipe.id, payload);
        setLoading(false);

        if (res.success) {
            router.push(`/owner/recipes/${recipe.id}`);
        } else {
            setError(res.message || "Failed to save changes.");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="min-h-screen bg-background space-y-8 p-4 md:p-8">
            <div className="mx-auto max-w-5xl space-y-6">
                {/* Breadcrumb & Header */}
                <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                        <Link href={`/owner/recipes/${recipe.id}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </Link>
                        <span>/</span>
                        <span>Edit Recipe</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight">Edit Recipe</h1>
                    <p className="mt-2 text-muted-foreground">{recipe.meal_name}</p>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Sidebar - Info & Preview */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Warning Alert */}
                        <Alert variant="destructive" className="border-amber-200 bg-amber-50 text-amber-900">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <AlertTitle>Heads Up</AlertTitle>
                            <AlertDescription>
                                Your changes will be submitted for re-verification with our audit team.
                            </AlertDescription>
                        </Alert>

                        {/* Macro Preview */}
                        <LiveMacroPreviewCard preview={livePreview} />

                        {/* Current Recipe Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Recipe Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div>
                                    <p className="text-xs text-muted-foreground font-semibold uppercase">Created</p>
                                    <p className="mt-1">{new Date(recipe.created_at).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground font-semibold uppercase">Status</p>
                                    <p className="mt-1 capitalize">{recipe.status || "Unknown"}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground font-semibold uppercase">Ingredients</p>
                                    <p className="mt-1">{rows.length} items</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Content - Form */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Error Alert */}
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {/* Recipe Details Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Recipe Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="meal-name" className="font-semibold">
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
                                    <Label htmlFor="prep-notes" className="font-semibold">
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

                        {/* Ingredients Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Ingredients</CardTitle>
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

                        {/* Action Buttons */}
                        <div className="flex gap-3 border-t pt-6">
                            <Button
                                type="button"
                                variant="outline"
                                size="lg"
                                onClick={() => router.back()}
                                disabled={loading}
                                className="uppercase font-semibold"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                size="lg"
                                className="flex-1 uppercase font-semibold"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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