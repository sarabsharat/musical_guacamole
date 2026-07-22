import React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serializePrisma } from "@/lib/serialize";
import { requireOwnerAuth } from "@/lib/Authentication/RequireOwnerAuth";
import { RecipeEditForm } from "@/components/owner/recipe-edit-form";
import {getRecipeClarifications} from "@/actions/RecipesActions";

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function RecipeEditPage({ params }: PageProps) {
    const { restaurantId } = await requireOwnerAuth();

    const { id } = await params;
    const recipeId = parseInt(id, 10);

    if (isNaN(recipeId)) {
        return notFound();
    }

    const recipe = await prisma.recipe.findFirst({
        where: {
            id: recipeId,
            restaurant_id: restaurantId,
        },
        include: {
            ingredients: {
                include: {
                    ingredient_item: true,
                },
            },
        },
    });

    if (!recipe) {
        return notFound();
    }

    const references = await prisma.ingredientReference.findMany({
        orderBy: { name: "asc" }
    });

    // ─── Check for pending clarifications ──────────────────────────
    const clarifications = await getRecipeClarifications(recipeId);
    const hasPendingClarifications = clarifications.length > 0;

    const serializedRecipe = serializePrisma(recipe);
    const serializedReferences = serializePrisma(references);

    return (
        <div className="flex flex-col gap-6 px-4 lg:px-6 py-4">
            <RecipeEditForm
                recipe={serializedRecipe}
                references={serializedReferences}
                hasPendingClarifications={hasPendingClarifications}
            />
        </div>
    );
}