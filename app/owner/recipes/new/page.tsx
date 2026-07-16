// src/app/owner/recipes/new/page.tsx
import React from "react";
import { requireOwnerAuth } from "@/lib/Authentication/RequireOwnerAuth";
import { prisma } from "@/lib/prisma";
import { serializePrisma } from "@/lib/serialize";
import { RecipeBuilderForm } from "@/components/owner/recipe-builder";

interface PageProps {
    searchParams: Promise<{ fromDraftId?: string }>;
}

export default async function NewRecipePage({ searchParams }: PageProps) {
    const { restaurantId } = await requireOwnerAuth();
    const { fromDraftId } = await searchParams;

    let prefilledIngredients: any[] = [];
    let chefNotes = "";

    // 1. Fetch Global JFDA Ingredients (Needed for manual additions)
    const references = await prisma.ingredientReference.findMany({
        orderBy: { name: "asc" }
    });
    const serializedReferences = serializePrisma(references);

    // 2. AI Catcher: If coming from a Draft, intercept and pre-fill
    if (fromDraftId) {
        const draftId = parseInt(fromDraftId, 10);
        if (!isNaN(draftId)) {
            const draft = await prisma.recipeDraft.findFirst({
                where: { id: draftId, restaurant_id: restaurantId }
                // include: { resolved_items: true } // Uncomment when your schema relations are set
            });

            if (draft) {
                chefNotes = draft.raw_input_text;
                // prefilledIngredients = draft.resolved_items;
            }
        }
    }

    return (
        <main className="min-h-screen bg-background p-6 md:p-8">
            <div className="max-w-5xl mx-auto space-y-6">

                <header className="pb-6 border-b border-border">
                    <h1 className="text-3xl font-black tracking-tight uppercase text-foreground">
                        {fromDraftId ? "Finalize AI Recipe" : "Create Manual Recipe"}
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        {fromDraftId
                            ? "Review the AI formulation, configure yield, and finalize."
                            : "Build a new formulation from scratch using the standardized database."}
                    </p>
                </header>

                <RecipeBuilderForm
                    initialIngredients={prefilledIngredients}
                    initialNotes={chefNotes}
                    references={serializedReferences} // Pass refs so they can manually add ingredients
                />
            </div>
        </main>
    );
}