// actions/RecipesActions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { Prisma, RecipeStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { serializePrisma } from "@/lib/serialize";
import { FetchRecipesQuery, RecipeSnapshot, UpdateRecipePayload } from "@/lib/shared-types";
import { calculateServerRecipeTotals } from "@/lib/utils/server-recipe-math";
import {
    updateRecipeSchema,
    createManualRecipeSchema,
} from "@/lib/validations/recipe-schema";
import { requireOwnerAuth } from "@/lib/Authentication/RequireOwnerAuth";
import { z } from "zod";

// ───────────────────────────────────────────────────────────────
// ─── Get Owner Recipes ─────────────────────────────────────────
// ───────────────────────────────────────────────────────────────
export async function getOwnerRecipes(query: FetchRecipesQuery) {
    const { restaurantId } = await requireOwnerAuth();

    try {
        const skip = (query.page - 1) * query.limit;

        const whereClause: Prisma.RecipeWhereInput = {
            restaurant_id: restaurantId,
            ...(query.status ? { status: query.status } : {}),
            ...(query.search ? { meal_name: { contains: query.search, mode: "insensitive" } } : {}),
            ...(query.allergens && query.allergens.length > 0 ? {
                detected_allergens: { hasSome: query.allergens }
            } : {}),
            ...(query.calMin !== undefined && query.calMin > 0 ? { calories: { gte: query.calMin } } : {}),
            ...(query.calMax !== undefined && query.calMax > 0 ? { calories: { lte: query.calMax } } : {}),
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

// ───────────────────────────────────────────────────────────────
// ─── Revert to Recipe Version ──────────────────────────────────
// ───────────────────────────────────────────────────────────────
export async function revertToRecipeVersion(recipeId: number, versionId: number) {
    const { userId, restaurantId } = await requireOwnerAuth();

    try {
        const versionRecord = await prisma.recipeVersion.findFirst({
            where: {
                id: versionId,
                recipe_id: recipeId,
                recipe: { restaurant_id: restaurantId },
            },
        });

        if (!versionRecord) {
            return { success: false, message: "Record not found or access denied." };
        }

        const snapshot = versionRecord.snapshot as unknown as RecipeSnapshot;

        await prisma.$transaction(async (tx) => {
            // 1. Revert base recipe values
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

            // 2. Clear present ingredient links
            await tx.recipeIngredient.deleteMany({
                where: { recipe_id: recipeId },
            });

            const snapshotIngredients = snapshot.ingredients || [];

            // 3. Re-inject snapshot ingredients defensively
            for (const ing of snapshotIngredients) {
                let resolvedIngredientId = ing.ingredient_id;

                if (!resolvedIngredientId && ing.name) {
                    const ref = await tx.ingredientReference.findFirst({
                        where: { name: ing.name },
                        select: { id: true },
                    });
                    if (ref) resolvedIngredientId = ref.id;
                }

                if (!resolvedIngredientId) {
                    throw new Error(`Failed to resolve ingredient reference: "${ing.name || "Unknown"}"`);
                }

                const statedAmount = ing.user_stated_amount || ing.amount || "1 unit";
                const gramsValue = ing.normalized_grams !== undefined
                    ? ing.normalized_grams
                    : (ing.weight_g !== undefined ? ing.weight_g : 100);

                await tx.recipeIngredient.create({
                    data: {
                        recipe_id: recipeId,
                        ingredient_id: resolvedIngredientId,
                        user_stated_amount: statedAmount,
                        normalized_grams: new Prisma.Decimal(gramsValue),
                    },
                });
            }

            await tx.auditLog.create({
                data: {
                    actor_id: Number(userId),
                    restaurant_id: restaurantId,
                    recipe_id: recipeId,
                    action: "RECIPE_REVERTED_TO_SNAPSHOT",
                    payload: { version_id: versionId },
                },
            });
        });

        revalidatePath(`/owner/recipes/${recipeId}`);
        revalidatePath(`/owner/recipes`);
        return { success: true, message: "Recipe reverted successfully. Pending for Re-verification" };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to roll back recipe version.";
        return { success: false, message: errorMessage };
    }
}

// ───────────────────────────────────────────────────────────────
// ─── Update Recipe ─────────────────────────────────────────────
// ───────────────────────────────────────────────────────────────
export async function updateRecipe(recipeId: number, payload: UpdateRecipePayload) {
    const { userId, restaurantId } = await requireOwnerAuth();

    const existingRecipe = await prisma.recipe.findFirst({
        where: { id: recipeId, restaurant_id: restaurantId },
    });
    if (!existingRecipe) {
        return { success: false, message: "Recipe not found." };
    }

    await prisma.$transaction(async (tx) => {
        await tx.recipe.update({
            where: { id: recipeId },
            data: {
                meal_name: payload.meal_name,
                preparation_notes: payload.preparation_notes,
                image_url: payload.image_url,
                status: "PENDING",
            },
        });

        await tx.recipeIngredient.deleteMany({
            where: { recipe_id: recipeId },
        });

        await tx.recipeIngredient.createMany({
            data: payload.ingredients.map((ing) => ({
                recipe_id: recipeId,
                ingredient_id: ing.ingredient_id,
                user_stated_amount: ing.user_stated_amount,
                normalized_grams: ing.normalized_grams,
            })),
        });
    });

    return { success: true, message: "Recipe updated." };
}

// ───────────────────────────────────────────────────────────────
// ─── Get Recipe Details ────────────────────────────────────────
// ───────────────────────────────────────────────────────────────
export async function getRecipeDetails(recipeId: number) {
    const { restaurantId } = await requireOwnerAuth();

    const validated = z.number().int().positive().safeParse(recipeId);
    if (!validated.success) {
        return { success: false, message: "Invalid recipe ID." };
    }

    try {
        const recipe = await prisma.recipe.findUnique({
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
                versions: {
                    orderBy: { created_at: "desc" },
                    take: 5,
                },
            },
        });

        if (!recipe) {
            return { success: false, message: "Recipe not found or access denied." };
        }

        return { success: true, data: serializePrisma(recipe) };
    } catch (error: unknown) {
        console.error("Get recipe details error:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch recipe details.";
        return { success: false, message: errorMessage };
    }
}

// ───────────────────────────────────────────────────────────────
// ─── Create Manual Recipe ──────────────────────────────────────
// ───────────────────────────────────────────────────────────────
export async function createManualRecipe(payload: unknown) {
    const { userId, restaurantId } = await requireOwnerAuth();

    const validated = createManualRecipeSchema.safeParse(payload);
    if (!validated.success) {
        return { success: false, message: validated.error.issues[0].message };
    }
    const validData = validated.data;

    try {
        const ingredientRefs = await prisma.ingredientReference.findMany({
            where: { id: { in: validData.ingredients.map((i) => i.ingredient_id) } },
        });

        const totals = calculateServerRecipeTotals(validData.ingredients, ingredientRefs);

        const newRecipe = await prisma.$transaction(async (tx) => {
            const recipe = await tx.recipe.create({
                data: {
                    restaurant_id: restaurantId,
                    meal_name: validData.meal_name,
                    preparation_notes: validData.preparation_notes,
                    image_url: validData.image_url || "",
                    calories: totals.calories,
                    protein: totals.protein,
                    carbs: totals.carbs,
                    total_fat: totals.total_fat,
                    detected_allergens: totals.detected_allergens,
                    status: RecipeStatus.PENDING,
                },
            });

            for (const rawIng of validData.ingredients) {
                await tx.recipeIngredient.create({
                    data: {
                        recipe_id: recipe.id,
                        ingredient_id: rawIng.ingredient_id,
                        user_stated_amount: rawIng.user_stated_amount,
                        normalized_grams: new Prisma.Decimal(rawIng.normalized_grams),
                    },
                });
            }

            await tx.auditLog.create({
                data: {
                    actor_id: Number(userId),
                    restaurant_id: restaurantId,
                    recipe_id: recipe.id,
                    action: "MANUAL_RECIPE_CREATED",
                    payload: { meal_name: validData.meal_name },
                },
            });

            return recipe;
        });

        revalidatePath("/owner/recipes");
        return { success: true, message: "Recipe created successfully.", recipeId: newRecipe.id };
    } catch (error: unknown) {
        console.error("Create manual recipe error:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to create recipe.";
        return { success: false, message: errorMessage };
    }
}


// ───────────────────────────────────────────────────────────────
// ─── Get Allergens from Database ──────────────────────────────────────
// ───────────────────────────────────────────────────────────────
export async function getAllergens() {
    const ingredients = await prisma.ingredientReference.findMany({
        select: { allergens: true },
    });
    const allAllergens = ingredients.flatMap(ing => ing.allergens);
    const uniqueAllergens = [...new Set(allAllergens)].sort();
    return uniqueAllergens;
}