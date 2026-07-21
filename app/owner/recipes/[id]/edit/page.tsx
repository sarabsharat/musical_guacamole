import React from "react";
import { notFound } from "next/navigation";
import { requireOwnerAuth } from "@/lib/Authentication/RequireOwnerAuth";
import { getRecipeDetails } from "@/actions/RecipesActions";
import { RecipeEditForm } from "@/components/owner/recipe-edit-form";
import { prisma } from "@/lib/prisma";

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function RecipeEditPage({ params }: PageProps) {
    // 1. Auth (still needed for the action, but we also need restaurantId for the form)
    const { restaurantId } = await requireOwnerAuth();

    const { id } = await params;
    const recipeId = parseInt(id, 10);

    if (isNaN(recipeId)) {
        return notFound();
    }

    // 2. Use the server action to fetch recipe details (with security and serialization)
    const result = await getRecipeDetails(recipeId);
    if (!result.success || !result.data) {
        return notFound();
    }

    // 3. Fetch ingredient references (global)
    const references = await prisma.ingredientReference.findMany({
        orderBy: { name: "asc" }
    });

    return (
        <div className="flex flex-col gap-6 px-4 lg:px-6 py-4">
            <RecipeEditForm
                recipe={result.data}
                references={references}
            />
        </div>
    );
}