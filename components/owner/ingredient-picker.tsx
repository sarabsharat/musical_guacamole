// components/owner/ingredient-picker.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Search, X, Plus, Clock, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Ingredient {
    id: number;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}

interface IngredientPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (ingredient: Ingredient, amount: number, unit: string) => void;
    ingredients: Ingredient[];
    recentlyUsed?: Ingredient[];
}

const POPULAR_INGREDIENTS: Ingredient[] = [
    { id: 1, name: "Chicken Breast", calories: 165, protein: 31, carbs: 0, fat: 3.6 },
    { id: 2, name: "Olive Oil", calories: 884, protein: 0, carbs: 0, fat: 100 },
    { id: 3, name: "Broccoli", calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
    { id: 4, name: "Rice", calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
    { id: 5, name: "Egg", calories: 155, protein: 13, carbs: 1.1, fat: 11 },
    { id: 6, name: "Milk", calories: 64, protein: 3.2, carbs: 4.8, fat: 3.3 },
];

const SERVING_UNITS = ["g", "kg", "ml", "l", "cup", "tbsp", "tsp", "piece", "oz"];

// ─── Helper to clean numbers ──────────────────────────────────────
const cleanNumber = (num: number): number => {
    return Math.round(num * 100) / 100;
};

export function IngredientPicker({
                                     isOpen,
                                     onClose,
                                     onSelect,
                                     ingredients,
                                     recentlyUsed = [],
                                 }: IngredientPickerProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
    const [amount, setAmount] = useState("");
    const [unit, setUnit] = useState("g");
    const [activeTab, setActiveTab] = useState("recent");

    // Auto-switch to search tab when typing
    useEffect(() => {
        if (searchQuery) {
            setActiveTab("search");
        }
    }, [searchQuery]);

    // Filter ingredients based on search
    const filteredIngredients = useMemo(() => {
        if (!searchQuery) return ingredients;
        const lower = searchQuery.toLowerCase();
        return ingredients.filter((ing) =>
            ing.name.toLowerCase().includes(lower)
        );
    }, [searchQuery, ingredients]);

    // Calculate macros for the selected amount
    const calculateMacros = () => {
        if (!selectedIngredient || !amount) return null;
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount)) return null;

        const gramsPerUnit: Record<string, number> = {
            g: 1, kg: 1000, ml: 1, l: 1000,
            cup: 240, tbsp: 15, tsp: 5, piece: 100, oz: 28.35,
        };
        const totalGrams = numAmount * (gramsPerUnit[unit] || 1);
        const ratio = totalGrams / 100; // per 100g
        return {
            calories: Math.round(selectedIngredient.calories * ratio),
            protein: cleanNumber(selectedIngredient.protein * ratio),
            carbs: cleanNumber(selectedIngredient.carbs * ratio),
            fat: cleanNumber(selectedIngredient.fat * ratio),
        };
    };

    const macros = calculateMacros();

    const handleSelect = () => {
        if (!selectedIngredient || !amount) return;
        onSelect(selectedIngredient, parseFloat(amount), unit);
        setSelectedIngredient(null);
        setAmount("");
        setUnit("g");
        onClose();
    };

    // ─── Ingredient list screen ──────────────────────────────────────
    if (!selectedIngredient) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black">Add Ingredient</DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden flex flex-col">
                        {/* Search bar */}
                        <div className="sticky top-0 bg-background z-10 pb-4 mb-4 border-b">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Search ingredients..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 h-12 text-base"
                                    autoFocus
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery("")}
                                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Tabs */}
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
                            <TabsList className="w-full bg-muted">
                                <TabsTrigger value="recent" className="flex-1 gap-2">
                                    <Clock className="h-4 w-4" /> Recent
                                </TabsTrigger>
                                <TabsTrigger value="popular" className="flex-1 gap-2">
                                    <TrendingUp className="h-4 w-4" /> Popular
                                </TabsTrigger>
                                <TabsTrigger value="search" className="flex-1 gap-2">
                                    <Search className="h-4 w-4" /> Search
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="recent" className="overflow-y-auto flex-1 mt-4">
                                {recentlyUsed.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p>No recently used ingredients</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {recentlyUsed.map((ing) => (
                                            <IngredientButton
                                                key={ing.id}
                                                ingredient={ing}
                                                onClick={() => setSelectedIngredient(ing)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="popular" className="overflow-y-auto flex-1 mt-4">
                                <div className="space-y-2">
                                    {POPULAR_INGREDIENTS.map((ing) => (
                                        <IngredientButton
                                            key={ing.id}
                                            ingredient={ing}
                                            onClick={() => setSelectedIngredient(ing)}
                                        />
                                    ))}
                                </div>
                            </TabsContent>

                            <TabsContent value="search" className="overflow-y-auto flex-1 mt-4">
                                {searchQuery && filteredIngredients.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p>No ingredients found for "{searchQuery}"</p>
                                    </div>
                                ) : !searchQuery ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p>Type to search for ingredients</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {filteredIngredients.map((ing) => (
                                            <IngredientButton
                                                key={ing.id}
                                                ingredient={ing}
                                                onClick={() => setSelectedIngredient(ing)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    // ─── Amount selection screen ─────────────────────────────────────
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black">{selectedIngredient.name}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-6">
                    {/* Per 100g info */}
                    <div className="bg-muted rounded-lg p-4 space-y-2">
                        <p className="text-sm text-muted-foreground">Per 100g</p>
                        <div className="grid grid-cols-4 gap-2 text-center">
                            <div><p className="text-lg font-bold">{selectedIngredient.calories}</p><p className="text-xs text-muted-foreground">kcal</p></div>
                            <div><p className="text-lg font-bold">{cleanNumber(selectedIngredient.protein)}g</p><p className="text-xs text-muted-foreground">Protein</p></div>
                            <div><p className="text-lg font-bold">{cleanNumber(selectedIngredient.carbs)}g</p><p className="text-xs text-muted-foreground">Carbs</p></div>
                            <div><p className="text-lg font-bold">{cleanNumber(selectedIngredient.fat)}g</p><p className="text-xs text-muted-foreground">Fat</p></div>
                        </div>
                    </div>

                    {/* Amount input */}
                    <div className="space-y-3">
                        <label className="text-sm font-semibold">How much?</label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0"
                                className="flex-1 h-12 px-4 rounded-lg border text-lg font-semibold bg-background"
                                autoFocus
                            />
                            <select
                                value={unit}
                                onChange={(e) => setUnit(e.target.value)}
                                className="px-4 py-3 rounded-lg border text-base font-medium bg-background"
                            >
                                {SERVING_UNITS.map((u) => (
                                    <option key={u} value={u}>{u}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Live macro preview */}
                    {macros && (
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
                            <p className="text-xs text-primary font-semibold uppercase">Nutrition Facts</p>
                            <div className="grid grid-cols-4 gap-2 text-center">
                                <div><p className="text-lg font-bold text-primary">{macros.calories}</p><p className="text-xs text-muted-foreground">kcal</p></div>
                                <div><p className="text-lg font-bold text-primary">{macros.protein}g</p><p className="text-xs text-muted-foreground">Protein</p></div>
                                <div><p className="text-lg font-bold text-primary">{macros.carbs}g</p><p className="text-xs text-muted-foreground">Carbs</p></div>
                                <div><p className="text-lg font-bold text-primary">{macros.fat}g</p><p className="text-xs text-muted-foreground">Fat</p></div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4 border-t">
                        <Button variant="outline" size="lg" onClick={() => setSelectedIngredient(null)} className="flex-1 uppercase font-semibold">
                            Back
                        </Button>
                        <Button onClick={handleSelect} disabled={!amount} size="lg" className="flex-1 uppercase font-semibold gap-2">
                            <Plus className="h-4 w-4" /> Add
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ─── Ingredient Button ──────────────────────────────────────────────
interface IngredientButtonProps {
    ingredient: Ingredient;
    onClick: () => void;
}

function IngredientButton({ ingredient, onClick }: IngredientButtonProps) {
    const clean = (num: number) => Math.round(num * 100) / 100;
    return (
        <button
            onClick={onClick}
            className="w-full text-left p-3 rounded-lg border bg-background hover:bg-accent hover:border-primary transition-colors group"
        >
            <div className="flex items-center justify-between">
                <div>
                    <p className="font-semibold group-hover:text-primary">{ingredient.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {ingredient.calories} cal • {clean(ingredient.protein)}g protein per 100g
                    </p>
                </div>
                <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
        </button>
    );
}