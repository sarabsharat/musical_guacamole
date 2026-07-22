// components/auditor/audit-queue-table.tsx
"use client";

import React, {useEffect, useState} from "react";
import { verifyRecipeLevel1, requestClarification } from "@/actions/AuditorActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Loader2, Eye, Check, X, MessageSquareWarning } from "lucide-react";
import {StatusBadge} from "@/components/shared/status-badge";

// Types inferred from your Prisma payload
type QueueItem = any; // Replace 'any' with your precise Prisma return type if you have it generated

export function AuditQueueTable({ queue }: { queue: QueueItem[] }) {
    const [selectedRecipe, setSelectedRecipe] = useState<QueueItem | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");


    const handleAction = async (actionType: "APPROVE" | "REJECT" | "CLARIFY") => {
        if (!selectedRecipe) return;
        setIsLoading(true);

        try {
            let res;
            if (actionType === "APPROVE") {
                res = await verifyRecipeLevel1({ recipeId: selectedRecipe.id, approved: true });
            } else if (actionType === "REJECT") {
                if (!rejectionReason) return toast.error("Rejection reason is required.");
                res = await verifyRecipeLevel1({ recipeId: selectedRecipe.id, approved: false, rejectionReason });
            } else if (actionType === "CLARIFY") {
                if (!rejectionReason) return toast.error("Clarification note is required.");
                res = await requestClarification({ recipeId: selectedRecipe.id, message: rejectionReason });
            }

            if (res?.success) {
                toast.success(res.message);
                setSelectedRecipe(null); // Close sheet
                setRejectionReason("");
            } else {
                toast.error(res?.message || "Action failed.");
            }
        } catch (error) {
            toast.error("An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    if (queue.length === 0) {
        return <div className="text-center py-10 text-muted-foreground">The queue is currently empty. Great job!</div>;
    }

    return (
        <>
            {/* The Data Table */}
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Restaurant</TableHead>
                        <TableHead>Recipe Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {queue.map((recipe) => (
                        <TableRow key={recipe.id}>
                            <TableCell className="font-medium">#{recipe.id}</TableCell>
                            <TableCell>{recipe.restaurant?.business_name}</TableCell>
                            <TableCell>{recipe.meal_name}</TableCell>
                            <TableCell><StatusBadge status={recipe.status} /></TableCell>
                            <TableCell className="text-right">
                                <Button variant="secondary" size="sm" onClick={() => setSelectedRecipe(recipe)}>
                                    <Eye className="w-4 h-4 mr-2" /> Review
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            {/* The Slide-Out Review Panel */}
            <Sheet open={!!selectedRecipe} onOpenChange={(open) => !open && setSelectedRecipe(null)}>
                <SheetContent className="sm:max-w-xl overflow-y-auto">
                    <SheetHeader className="mb-6">
                        <SheetTitle className="text-2xl">{selectedRecipe?.meal_name}</SheetTitle>
                        <SheetDescription>
                            From: {selectedRecipe?.restaurant?.business_name}
                        </SheetDescription>
                    </SheetHeader>

                    {selectedRecipe && (
                        <div className="space-y-6">
                            {/* Macros Breakdown */}
                            <div className="grid grid-cols-4 gap-2 text-center p-4 bg-muted rounded-lg">
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase">Calories</p>
                                    <p className="font-bold">{selectedRecipe.calories}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase">Protein</p>
                                    <p className="font-bold text-protein">{selectedRecipe.protein}g</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase">Carbs</p>
                                    <p className="font-bold text-carbs">{selectedRecipe.carbs}g</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase">Fat</p>
                                    <p className="font-bold text-fats">{selectedRecipe.total_fat}g</p>
                                </div>
                            </div>

                            {/* Ingredient List */}
                            <div>
                                <h3 className="font-semibold mb-2">Stated Ingredients</h3>
                                <ul className="space-y-2 text-sm">
                                    {selectedRecipe.ingredients?.map((ing: any, i: number) => (
                                        <li key={i} className="flex justify-between border-b pb-1">
                                            <span>{ing.ingredient_item?.name}</span>
                                            <span className="text-muted-foreground">{ing.user_stated_amount}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Resolution Controls */}
                            <div className="pt-6 border-t mt-auto space-y-4">
                                <Input
                                    placeholder="Add notes for Rejection or Clarification..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                />
                                <div className="grid grid-cols-3 gap-2">
                                    <Button
                                        variant="default"
                                        className="bg-emerald-600 hover:bg-emerald-700"
                                        onClick={() => handleAction("APPROVE")}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                                        Approve
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="border-amber-500 text-amber-600 hover:bg-amber-50"
                                        onClick={() => handleAction("CLARIFY")}
                                        disabled={isLoading || !rejectionReason}
                                    >
                                        <MessageSquareWarning className="w-4 h-4 mr-2" />
                                        Clarify
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={() => handleAction("REJECT")}
                                        disabled={isLoading || !rejectionReason}
                                    >
                                        <X className="w-4 h-4 mr-2" />
                                        Reject
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </>
    );
}