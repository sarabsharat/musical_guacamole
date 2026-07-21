// components/owner/ingredient-picker-dialog.tsx
"use client";

import React, { useState } from "react";
import { IngredientReference } from "@prisma/client";
import { IngredientPicker } from "./ingredient-picker";
import { cn } from "@/lib/utils";
import { ChevronsUpDown } from "lucide-react";

interface IngredientPickerDialogProps {
    ingredients: IngredientReference[];
    value: number;
    onSelectIngredient: (data: {
        ingredientId: number;
        amount: number;
        unit: string;
        grams: number;
    }) => void;
    placeholder?: string;
    className?: string;
}

const toNumber = (val: any): number => {
    if (val === null || val === undefined) return 0;
    if (typeof val === "number") return val;
    if (typeof val === "object" && "toNumber" in val) return val.toNumber();
    return Number(val);
};

const cleanNumber = (num: number): number => Math.round(num * 100) / 100;

export function IngredientPickerDialog({
                                           ingredients,
                                           value,
                                           onSelectIngredient,
                                           placeholder = "Select ingredient...",
                                           className,
                                       }: IngredientPickerDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const selected = ingredients.find((i) => i.id === value);

    const pickerIngredients = ingredients.map((ing) => ({
        id: ing.id,
        name: ing.name,
        calories: cleanNumber(toNumber(ing.calories_per_g) * 100),
        protein: cleanNumber(toNumber(ing.protein_per_g) * 100),
        carbs: cleanNumber(toNumber(ing.carbs_per_g) * 100),
        fat: cleanNumber(toNumber(ing.fat_per_g) * 100),
    }));

    const handleSelect = (ingredient: any, amount: number, unit: string) => {
        // Calculate grams based on unit
        const gramsPerUnit: Record<string, number> = {
            g: 1, kg: 1000, ml: 1, l: 1000,
            cup: 240, tbsp: 15, tsp: 5, piece: 100, oz: 28.35,
        };
        const grams = amount * (gramsPerUnit[unit] || 1);

        onSelectIngredient({
            ingredientId: ingredient.id,
            amount,
            unit,
            grams: cleanNumber(grams),
        });
        setIsOpen(false);
    };

    return (
        <>
            <div
                onClick={() => setIsOpen(true)}
                className={cn(
                    "flex h-9 w-full cursor-pointer items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background hover:bg-accent hover:text-accent-foreground transition-colors",
                    className
                )}
            >
                <span className="truncate">
                    {selected ? selected.name : placeholder}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </div>

            <IngredientPicker
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                onSelect={handleSelect}
                ingredients={pickerIngredients}
                recentlyUsed={pickerIngredients.slice(0, 5)}
            />
        </>
    );
}