"use server";

import { prisma } from "@/lib/prisma";
import { assertUserAccess, SessionUser } from "@/lib/security";
import { Prisma, RecipeStatus, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { serializePrisma } from "@/lib/serialize";

interface FetchRecipesQuery {
    tenantId: number;
    status?: RecipeStatus;
    search?: string;
    page: number;
    limit: number;
}

interface RecipeSnapshot {
    meal_name: string;
    image_url: string;
    preparation_notes: string;
    calories: string | number;
    protein: string | number;
    carbs: string | number;
    total_fat: string | number;
    detected_allergens?: string[];
    ingredients?: Array<{
        ingredient_id: number;
        user_stated_amount: string;
        normalized_grams: string | number;
    }>;
}

/**
 * Securely queries paginated recipes bound to the owner's workspace context.
 * Serializes returned database primitives for RSC compatibility.
 */
export async function getOwnerRecipes(query: FetchRecipesQuery) {
    try {
        const skip = (query.page - 1) * query.limit;

        const whereClause: Prisma.RecipeWhereInput = {
            restaurant_id: query.tenantId,
            ...(query.status ? { status: query.status } : {}),
            ...(query.search
                ? {
                    meal_name: {
                        contains: query.search,
                        mode: "insensitive",
                    },
                }
                : {}),
        };

        const [recipes, totalCount] = await prisma.$transaction([
            prisma.recipe.findMany({
                where: whereClause,
                orderBy: { id: "desc" },
                skip,
                take: query.limit,
            }),
            prisma.recipe.count({ where: whereClause }),
        ]);

        return {
            success: true,
            message: "Recipes retrieved.",
            data: serializePrisma({
                recipes,
                totalCount,
                totalPages: Math.ceil(totalCount / query.limit),
            }),
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load database records.";
        return { success: false, message: errorMessage };
    }
}

export async function revertToRecipeVersion(
    currentUser: SessionUser,
    recipeId: number,
    versionId: number
) {
    try {
        await assertUserAccess(
            currentUser,
            [Role.restaurant_owner],
            currentUser.restaurantId
        );

        // Fetch snapshot
        const versionRecord = await prisma.recipeVersion.findFirst({
            where: { id: versionId, recipe_id: recipeId },
        });

        if (!versionRecord) {
            return { success: false, message: "Record not found." };
        }

        const snapshot = versionRecord.snapshot as unknown as RecipeSnapshot;

        await prisma.$transaction(async (tx) => {
            // Bring back old fields
            await tx.recipe.update({
                where: { id: recipeId },
                data: {
                    meal_name: snapshot.meal_name,
                    image_url: snapshot.image_url,
                    preparation_notes: snapshot.preparation_notes,
                    calories: new Prisma.Decimal(snapshot.calories),
                    protein: new Prisma.Decimal(snapshot.protein),
                    carbs: new Prisma.Decimal(snapshot.carbs),
                    total_fat: new Prisma.Decimal(snapshot.total_fat),
                    status: RecipeStatus.PENDING,
                    detected_allergens: snapshot.detected_allergens || [],
                },
            });

            await tx.recipeIngredient.deleteMany({
                where: { recipe_id: recipeId },
            });

            const snapshotIngredients = snapshot.ingredients || [];

            for (const ing of snapshotIngredients) {
                await tx.recipeIngredient.create({
                    data: {
                        recipe_id: recipeId,
                        ingredient_id: ing.ingredient_id,
                        user_stated_amount: ing.user_stated_amount,
                        normalized_grams: new Prisma.Decimal(ing.normalized_grams),
                    },
                });
            }

            await tx.auditLog.create({
                data: {
                    actor_id: currentUser.id,
                    restaurant_id: currentUser.restaurantId!,
                    recipe_id: recipeId,
                    action: "RECIPE_REVERTED_TO_SNAPSHOT",
                    payload: { version_id: versionId },
                },
            });
        });

        revalidatePath(`/owner/recipes/${recipeId}`);
        return { success: true, message: "Recipe reverted successfully. Pending for Re-verification" };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to roll back recipe version.";
        return { success: false, message: errorMessage };
    }
}