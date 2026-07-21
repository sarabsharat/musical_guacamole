// components/owner/ingredient-mapper-grid.tsx
"use client";

import React from "react";
import { IngredientReference } from "@prisma/client";
import { IngredientRow } from "@/lib/shared-types";
import { IngredientPickerDialog } from "./ingredient-picker-dialog";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export interface IngredientGridProps {
    rows: IngredientRow[];
    references: IngredientReference[];
    onUpdate: (keyId: string, field: keyof IngredientRow, value: string | number) => void;
    onRemove: (keyId: string) => void;
    onAdd: () => void;
}

export function IngredientMapperGrid({ rows, references, onUpdate, onRemove, onAdd }: IngredientGridProps) {
    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h3 className="text-sm font-semibold text-foreground">Ingredient Mapping</h3>
                    <p className="text-xs text-muted-foreground">Map AI‑extracted ingredients to your database</p>
                </div>
                <Button type="button" onClick={onAdd} size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Ingredient
                </Button>
            </div>

            <div className="space-y-3">
                {rows.map((row) => (
                    <Card key={row.keyId} className="border-border hover:border-primary/50 transition-colors">
                        <CardContent className="p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">
                                        Ingredient
                                    </label>
                                    <Input
                                        value={row.rawText}
                                        onChange={(e) => onUpdate(row.keyId, "rawText", e.target.value)}
                                        className="h-9 text-sm bg-background"
                                        placeholder="e.g. Chicken breast"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">
                                        Amount
                                    </label>
                                    <Input
                                        value={row.userStatedAmount}
                                        onChange={(e) => onUpdate(row.keyId, "userStatedAmount", e.target.value)}
                                        className="h-9 text-sm bg-background"
                                        placeholder="e.g. 200g"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">
                                        Weight (g)
                                    </label>
                                    <Input
                                        type="number"
                                        value={row.normalizedGrams || ""}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            onUpdate(row.keyId, "normalizedGrams", isNaN(val) ? 0 : val);
                                        }}
                                        className="h-9 text-sm bg-background"
                                        placeholder="0"
                                        step="0.1"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">
                                        Match to Database
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <IngredientPickerDialog
                                            ingredients={references}
                                            value={row.selectedIngredientId}
                                            onSelectIngredient={(data) => {
                                                onUpdate(row.keyId, "selectedIngredientId", data.ingredientId);
                                                onUpdate(row.keyId, "userStatedAmount", `${data.amount} ${data.unit}`);
                                                onUpdate(row.keyId, "normalizedGrams", data.grams);
                                            }}
                                            placeholder="Select ingredient..."
                                            className="flex-1 min-w-0" // 👈 truncate if long
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onRemove(row.keyId)}
                                            className="h-9 w-9 flex-shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" // 👈 always visible
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">Remove</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {rows.length === 0 && (
                    <Card className="border-2 border-dashed border-border bg-muted/20">
                        <CardContent className="py-8 text-center text-muted-foreground">
                            No ingredients added yet. Click "Add Ingredient" to start mapping.
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}