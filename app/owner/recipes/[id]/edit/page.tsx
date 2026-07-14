// src/app/owner/recipes/[id]/edit/page.tsx
import React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serializePrisma } from "@/lib/serialize";
import { requireOwnerAuth } from "@/lib/Authentication/RequireOwnerAuth";
import { RecipeEditForm } from "@/components/owner/recipe-edit-form";

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function RecipeEditPage({ params }: PageProps) {
    // 1. 🚨 SECURITY: Auth Wall
    const { userId, restaurantId } = await requireOwnerAuth();

    const { id } = await params;
    const recipeId = parseInt(id, 10);

    if (isNaN(recipeId)) {
        return notFound();
    }

    // 2. Query Recipe with strict tenant isolation
    const recipe = await prisma.recipe.findFirst({
        where: {
            id: recipeId,
            restaurant_id: restaurantId, // 👈 Ensures they own this recipe
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

    // 3. Fetch reference ingredient library
    // 🚨 BUG FIX: Removed the `where: {id: restaurantId}` constraint here.
    // Ingredient references are global for the whole platform, so we want all of them!
    const references = await prisma.ingredientReference.findMany({
        orderBy: { name: "asc" }
    });

    // 4. Serialize database objects
    const serializedRecipe = serializePrisma(recipe);
    const serializedReferences = serializePrisma(references);

    // 5. Reconstruct the mock user for your existing Client Component
    const mockUser = { id: userId, restaurantId, role: "restaurant_owner" } as any;

    return (
        <div className="min-h-screen bg-neutral-100 p-8 text-black">
            <RecipeEditForm
                currentUser={mockUser}
                recipe={serializedRecipe}
                references={serializedReferences}
            />
        </div>
    );
}