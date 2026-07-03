// src/app/owner/recipes.ts/[id]/edit/page.tsx
import React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serializePrisma } from "@/lib/serialize";
import { getSession, assertUserAccess } from "@/lib/security";
import { RecipeEditForm } from "@/components/owner/recipe-edit-form";
import { Role } from "@prisma/client";

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function RecipeEditPage({ params }: PageProps) {

    const currentUser = await getSession();


    // 2. 🚨 SECURITY: Page-level guardrail
    await assertUserAccess(currentUser, [Role.restaurant_owner], currentUser?.restaurantId);

    // 3. Resolve dynamic parameters [1]
    const { id } = await params;
    const recipeId = parseInt(id, 10);

    if (isNaN(recipeId)) {
        return notFound();
    }

    // 4. Query Recipe with strict tenant isolation
    const recipe = await prisma.recipe.findFirst({
        where: {
            id: recipeId,
            restaurant_id: currentUser!.restaurantId!,
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

    // 5. Fetch reference ingredient library
    const references = await prisma.ingredientReference.findMany({ orderBy: { name: "asc" } });

    // 6. Serialize database objects [2]
    const serializedRecipe = serializePrisma(recipe);
    const serializedReferences = serializePrisma(references);

    return (
        <div className="min-h-screen bg-neutral-100 p-8 text-black font-mono">
            <RecipeEditForm
                currentUser={currentUser!}
                recipe={serializedRecipe}
                references={serializedReferences}
            />
        </div>
    );
}