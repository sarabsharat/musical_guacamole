"use client";

import { IngredientReference } from "@prisma/client";
import { SessionUser, Recipe, RecipeIngredient, UpdateRecipePayload } from "@/lib/shared-types";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { updateRecipe } from "@/actions/owner-recipes";
import Link from "next/link";
import {generateSafeId, IngredientMapperGrid, LiveMacroPreviewCard, useIngredientMapper} from "@/lib/utils/recipe-form";

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

    // Utilize the shared custom hook
    const initialRows = (Array.isArray(recipe.ingredients) ? recipe.ingredients : []).map((ing: RecipeIngredient) => ({
        keyId: generateSafeId(),
        rawText: ing.ingredient_item?.name || "Active Ingredient",
        userStatedAmount: ing.user_stated_amount || "1 unit",
        normalizedGrams: Number(ing.normalized_grams) || 100,
        selectedIngredientId: Number(ing.ingredient_id) || references[0]?.id || 0,
    }));

    const { rows, updateRowField, removeRow, addManualRow, livePreview } = useIngredientMapper(initialRows, references);

    const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
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
        <div className="mx-auto max-w-5xl border-4 border-black bg-white p-6 rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="mb-6 font-mono text-xs uppercase flex space-x-2 border-b-2 border-black pb-2">
                <Link href={`/recipes/${recipe.id}`} className="underline hover:text-red-500">Back to File</Link>
                <span>/</span>
                <span className="text-neutral-500">Adjust Recipe: {recipe.meal_name}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <div className="border-4 border-black p-4 bg-red-50 rounded-none">
                        <h3 className="font-mono text-sm font-bold uppercase border-b-2 border-black pb-1 mb-2 text-red-700">Re-Verification Required</h3>
                        <p className="font-mono text-xs leading-tight text-red-900">Saving your changes will submit the recipe for digital audit queue re-verification.</p>
                    </div>
                    {/* Inject shared UI */}
                    <LiveMacroPreviewCard preview={livePreview} />
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && <div className="border-4 border-red-600 bg-red-50 p-4 font-mono text-xs uppercase text-red-700 rounded-none">{error}</div>}

                        <div className="space-y-2">
                            <label className="block font-mono text-sm font-bold uppercase">Meal Name</label>
                            <input required type="text" value={mealName} onChange={(e) => setMealName(e.target.value)} className="w-full border-4 border-black p-3 font-mono text-xs rounded-none focus:outline-none" />
                        </div>

                        <div className="space-y-2">
                            <label className="block font-mono text-sm font-bold uppercase">Preparation Notes</label>
                            <textarea required rows={4} value={preparationNotes} onChange={(e) => setPreparationNotes(e.target.value)} className="w-full border-4 border-black p-3 font-mono text-xs rounded-none focus:outline-none" />
                        </div>

                        {/* Inject shared UI */}
                        <IngredientMapperGrid rows={rows} references={references} onUpdate={updateRowField} onRemove={removeRow} onAdd={addManualRow} />

                        <div className="flex gap-4 pt-4 border-t-4 border-black">
                            <button type="submit" disabled={loading} className="flex-1 bg-green-500 text-black py-3 font-mono text-sm font-bold uppercase border-2 border-black rounded-none transition hover:bg-green-600">
                                {loading ? "Updating..." : "Save Changes & Re-Submit"}
                            </button>
                            <Link href={`/recipes/${recipe.id}`} className="bg-white border-2 border-black text-black px-6 py-3 font-mono text-sm font-bold uppercase flex items-center justify-center hover:bg-neutral-50">Cancel</Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}