// components/auditor/recipe-review-form.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { verifyRecipeLevel1, requestClarification } from "@/actions/AuditorActions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Check, X, MessageSquareWarning } from "lucide-react";

interface RecipeReviewFormProps {
    recipe: any; // we can improve type later
}

export function RecipeReviewForm({ recipe }: RecipeReviewFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [note, setNote] = useState("");

    const handleAction = async (action: "APPROVE" | "REJECT" | "CLARIFY") => {
        setLoading(true);
        try {
            let res;
            if (action === "APPROVE") {
                res = await verifyRecipeLevel1({ recipeId: recipe.id, approved: true });
            } else if (action === "REJECT") {
                if (!note) return toast.error("Rejection reason is required.");
                res = await verifyRecipeLevel1({ recipeId: recipe.id, approved: false, rejectionReason: note });
            } else if (action === "CLARIFY") {
                if (!note) return toast.error("Clarification message is required.");
                res = await requestClarification({ recipeId: recipe.id, message: note });
            }
            if (res?.success) {
                toast.success(res.message);
                router.push("/auditor/queue");
                router.refresh();
            } else {
                toast.error(res?.message || "Action failed.");
            }
        } catch (error) {
            toast.error("An error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                    <h3 className="font-semibold">Ingredients</h3>
                    <ul className="space-y-1 text-sm">
                        {recipe.ingredients?.map((ing: any, i: number) => (
                            <li key={i} className="flex justify-between border-b py-1">
                                <span>{ing.ingredient_item?.name}</span>
                                <span className="text-muted-foreground">{ing.user_stated_amount}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Notes</label>
                    <Textarea
                        placeholder="Add rejection reason or clarification note..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={3}
                    />
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <Button
                        variant="default"
                        className="bg-primary hover:bg-primary/90"
                        onClick={() => handleAction("APPROVE")}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                        Approve
                    </Button>
                    <Button
                        variant="outline"
                        className="border-amber-500 text-amber-600 hover:bg-amber-50"
                        onClick={() => handleAction("CLARIFY")}
                        disabled={loading || !note}
                    >
                        <MessageSquareWarning className="h-4 w-4 mr-2" />
                        Clarify
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => handleAction("REJECT")}
                        disabled={loading || !note}
                    >
                        <X className="h-4 w-4 mr-2" />
                        Reject
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}