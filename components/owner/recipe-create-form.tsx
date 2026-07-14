"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createManualRecipe } from "@/actions/RecipesActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, Loader2, AlertCircle, ChevronRight } from "lucide-react";

interface IngredientReference {
    id: number;
    name: string;
}

interface RecipeCreateFormProps {
    currentUser?: unknown; // ✅ FIX 1: Changed 'any' to 'unknown'
    references: IngredientReference[];
}

export function RecipeCreateForm({ references }: RecipeCreateFormProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [mealName, setMealName] = useState("");
    const [preparationNotes, setPreparationNotes] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [ingredients, setIngredients] = useState([
        { ingredient_id: 0, user_stated_amount: "", normalized_grams: 0 },
    ]);

    const handleAddIngredient = () => {
        setIngredients([...ingredients, { ingredient_id: 0, user_stated_amount: "", normalized_grams: 0 }]);
    };

    const handleRemoveIngredient = (index: number) => {
        const newIngredients = ingredients.filter((_, i) => i !== index);
        setIngredients(newIngredients.length === 0 ? [{ ingredient_id: 0, user_stated_amount: "", normalized_grams: 0 }] : newIngredients);
    };

    // ✅ FIX 2: Changed 'any' to 'string | number'
    const handleIngredientChange = (index: number, field: string, value: string | number) => {
        const newIngredients = [...ingredients];
        newIngredients[index] = { ...newIngredients[index], [field]: value } as any;
        setIngredients(newIngredients);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        if (!mealName.trim()) {
            setError("Meal name is required.");
            setIsSubmitting(false);
            return;
        }

        const validIngredients = ingredients.filter((ing) => ing.ingredient_id !== 0 && ing.normalized_grams > 0);
        if (validIngredients.length === 0) {
            setError("Add at least one ingredient with a weight in grams.");
            setIsSubmitting(false);
            return;
        }

        const payload = {
            meal_name: mealName,
            preparation_notes: preparationNotes,
            image_url: imageUrl,
            ingredients: validIngredients,
        };

        // ✅ FIX 3: Removed 'undefined'. createManualRecipe only takes 1 argument.
        const response = await createManualRecipe(payload);

        if (response.success) {
            router.push("/owner/recipes");
        } else {
            setError(response.message || "Failed to create recipe.");
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="min-h-screen bg-background space-y-8 p-4 md:p-8">
            <div className="mx-auto max-w-2xl space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-4xl font-black tracking-tight">Create Recipe</h1>
                    <p className="mt-2 text-muted-foreground">Add a new dish to your menu portfolio</p>
                </div>

                {/* Error Alert */}
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Basic Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recipe Details</CardTitle>
                        <CardDescription>Basic information about your dish</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="mealName" className="font-semibold">
                                Meal Name *
                            </Label>
                            <Input
                                id="mealName"
                                type="text"
                                value={mealName}
                                onChange={(e) => setMealName(e.target.value)}
                                placeholder="e.g. Chicken Shawarma, Tabbouleh, Falafel Wrap"
                                className="bg-background"
                                required
                            />
                            <p className="text-xs text-muted-foreground">Give your dish a clear, descriptive name</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="prepNotes" className="font-semibold">
                                Preparation Notes
                            </Label>
                            <Textarea
                                id="prepNotes"
                                value={preparationNotes}
                                onChange={(e) => setPreparationNotes(e.target.value)}
                                placeholder="Cooking methods, special techniques, dietary notes..."
                                rows={4}
                                className="resize-none bg-background"
                            />
                            <p className="text-xs text-muted-foreground">Optional: Include cooking instructions or special handling</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="imageUrl" className="font-semibold">
                                Image URL
                            </Label>
                            <Input
                                id="imageUrl"
                                type="url"
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                placeholder="https://example.com/image.jpg"
                                className="bg-background"
                            />
                            <p className="text-xs text-muted-foreground">Optional: Link to a dish photo</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Ingredients List */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <div>
                            <CardTitle>Ingredients</CardTitle>
                            <CardDescription>List all components of your dish</CardDescription>
                        </div>
                        <Button
                            type="button"
                            onClick={handleAddIngredient}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Add Item
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {ingredients.map((ing, index) => (
                            <div
                                key={index}
                                className="p-4 rounded-lg border bg-card space-y-3 hover:border-primary/50 transition-colors"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Ingredient Select */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            Ingredient
                                        </Label>
                                        <select
                                            value={ing.ingredient_id}
                                            onChange={(e) =>
                                                handleIngredientChange(index, "ingredient_id", parseInt(e.target.value))
                                            }
                                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            required
                                        >
                                            <option value={0} disabled>
                                                -- Select --
                                            </option>
                                            {references.map((ref) => (
                                                <option key={ref.id} value={ref.id}>
                                                    {ref.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Stated Amount */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            Amount
                                        </Label>
                                        <Input
                                            placeholder="e.g. 1 cup, 2 slices, 150ml"
                                            value={ing.user_stated_amount}
                                            onChange={(e) =>
                                                handleIngredientChange(index, "user_stated_amount", e.target.value)
                                            }
                                            className="bg-background"
                                            required
                                        />
                                    </div>

                                    {/* Weight in Grams */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            Weight (g) *
                                        </Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            step="0.1"
                                            placeholder="e.g. 150"
                                            value={ing.normalized_grams || ""}
                                            onChange={(e) =>
                                                handleIngredientChange(index, "normalized_grams", parseFloat(e.target.value) || 0)
                                            }
                                            className="bg-background"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Remove Button */}
                                {ingredients.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveIngredient(index)}
                                        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Remove Ingredient
                                    </Button>
                                )}
                            </div>
                        ))}

                        <p className="text-xs text-muted-foreground text-center pt-2">
                            Accurate weights in grams help ensure proper nutritional calculations
                        </p>
                    </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-6 border-t">
                    <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        onClick={() => router.back()}
                        disabled={isSubmitting}
                        className="uppercase font-semibold"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        size="lg"
                        className="flex-1 uppercase font-semibold gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            <>
                                Create Recipe
                                <ChevronRight className="h-4 w-4" />
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </form>
    );
}