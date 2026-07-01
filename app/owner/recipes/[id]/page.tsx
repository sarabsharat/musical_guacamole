import React from "react";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serializePrisma } from "@/lib/serialize";
import { assertUserAccess } from "@/lib/security";
import { Role } from "@prisma/client";
import { getSession } from "@/lib/auth";

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function RecipeDetailPage({ params }: PageProps) {
    // 1. Get the authenticated session
    const currentUser = await getSession();

    if (!currentUser) {
        redirect("/auth/login");
    }

    // 2. 🚨 PAGE-LEVEL GUARDRAIL 🚨
    await assertUserAccess(currentUser, [Role.restaurant_owner], currentUser.restaurantId);

    if (!currentUser.restaurantId) {
        throw new Error("Security Violation: No tenant context found.");
    }

    // 3. Resolve dynamic ID
    const { id } = await params;
    const recipeId = parseInt(id, 10);

    if (isNaN(recipeId)) {
        return notFound();
    }

    // 4. Fetch the recipe with DOUBLE SECURITY
    // We filter by ID AND restaurant_id. If a user tries to access a recipe ID
    // that belongs to another restaurant, this query will return null, and we return 404.
    const recipe = await prisma.recipe.findFirst({
        where: {
            id: recipeId,
            restaurant_id: currentUser.restaurantId,
        },
        include: {
            ingredients: {
                include: { ingredient_item: true }
            }
        }
    });

    if (!recipe) {
        return notFound();
    }

    const serializedRecipe = serializePrisma(recipe);

    return (
        <div className="min-h-screen bg-neutral-100 p-8 text-black">
            {/* Your Brutalist UI components for recipe detail go here */}
            <h1 className="text-3xl font-bold">{serializedRecipe.meal_name}</h1>
            {/* ... */}
        </div>
    );
}