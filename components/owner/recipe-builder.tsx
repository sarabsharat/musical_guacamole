"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, ChefHat, Timer, Scale, BookOpen, Save } from "lucide-react";

interface RecipeBuilderProps {
    initialIngredients?: any[];
    initialNotes?: string;
}

export function RecipeBuilderForm({ initialIngredients = [], initialNotes = "" }: RecipeBuilderProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Form State
    const [recipeName, setRecipeName] = useState("");
    const [prepTime, setPrepTime] = useState("");
    const [yieldAmount, setYieldAmount] = useState("");
    const [instructions, setInstructions] = useState(initialNotes);

    const handleSaveRecipe = async () => {
        setLoading(true);

        // Construct the final payload for your Server Action
        const payload = {
            name: recipeName,
            prep_time_minutes: parseInt(prepTime) || 0,
            yield_amount: yieldAmount,
            instructions: instructions,
            ingredients: initialIngredients,
        };

        try {
            // Replace with your actual Server Action (e.g., createFinalRecipe(payload))
            // const res = await createFinalRecipe(payload);

            // Simulating network delay for now
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // On success, take them to the live recipe portfolio
            router.push("/owner/recipes");
        } catch (error) {
            console.error("Failed to save recipe:", error);
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* 1. Meta Information Panel */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-lg space-y-6">
                <h2 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2 mb-4">
                    <ChefHat size={16} /> Core Details
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-3">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Recipe Name</label>
                        <input
                            required
                            type="text"
                            placeholder="e.g., Signature Lemon Herb Chicken"
                            value={recipeName}
                            onChange={(e) => setRecipeName(e.target.value)}
                            className="w-full bg-background border border-border rounded-lg p-3 text-sm focus:border-primary outline-none transition-all mt-1"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1">
                            <Scale size={12} /> Total Yield
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., 4 Servings or 1000g"
                            value={yieldAmount}
                            onChange={(e) => setYieldAmount(e.target.value)}
                            className="w-full bg-background border border-border rounded-lg p-3 text-sm focus:border-primary outline-none transition-all mt-1"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1">
                            <Timer size={12} /> Prep Time (Mins)
                        </label>
                        <input
                            type="number"
                            placeholder="e.g., 45"
                            value={prepTime}
                            onChange={(e) => setPrepTime(e.target.value)}
                            className="w-full bg-background border border-border rounded-lg p-3 text-sm focus:border-primary outline-none transition-all mt-1"
                        />
                    </div>
                </div>
            </div>

            {/* 2. Formulation & Instructions Panel */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
                <h2 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2 mb-4">
                    <BookOpen size={16} /> Methodology
                </h2>

                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Preparation Instructions</label>
                <textarea
                    rows={8}
                    placeholder="Enter step-by-step instructions..."
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg p-3 text-sm focus:border-primary outline-none transition-all mt-1 resize-y leading-relaxed"
                />

                {/* Visual indicator that ingredients were successfully passed over */}
                <div className="mt-4 flex items-center justify-between bg-primary/5 border border-primary/20 p-4 rounded-lg">
                    <span className="text-xs font-medium text-muted-foreground">
                        Ingredient Formulation Linked
                    </span>
                    <span className="text-xs font-bold text-primary uppercase bg-primary/10 px-2 py-1 rounded">
                        {initialIngredients.length} Items Locked
                    </span>
                </div>
            </div>

            {/* 3. Final Submission */}
            <Button
                onClick={handleSaveRecipe}
                disabled={loading || !recipeName}
                size="lg"
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 uppercase font-black text-base tracking-widest py-8 shadow-xl"
            >
                {loading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                    <><Save className="mr-2 h-5 w-5" /> Publish Official Recipe</>
                )}
            </Button>
        </div>
    );
}