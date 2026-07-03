// actions/owner-recipes.ts
"use server";

import { prisma } from "@/lib/prisma";
import { assertUserAccess } from "@/lib/security";
import { Prisma, RecipeStatus, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { serializePrisma } from "@/lib/serialize";
import {FetchRecipesQuery, RecipeSnapshot, SessionUser, UpdateRecipePayload} from "@/lib/shared-types";
import { calculateServerRecipeTotals } from "@/lib/utils/server-recipe-math";
import {updateRecipeSchema} from "@/lib/validations/recipe-schema";

/**
 * Securely queries paginated recipes bound to the owner's workspace context.
 * Serializes returned database primitives for RSC compatibility.
 */
export async function getOwnerRecipes(currentUser: SessionUser, query: FetchRecipesQuery) {
    // 🚨 GUARDRAIL OUTSIDE THE TRY/CATCH 🚨
    await assertUserAccess(currentUser, [Role.restaurant_owner], currentUser.restaurantId);

    if (!currentUser.restaurantId) {
        throw new Error("Security Violation: No tenant context found.");
    }

    try {
        const skip = (query.page - 1) * query.limit;

        const whereClause: Prisma.RecipeWhereInput = {
            restaurant_id: currentUser.restaurantId,
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

/**
 * Reverts a recipe to a previous immutable approved version snapshot.
 * Employs defensive parsing to resolve both seeded and audited snapshot schemas.
 */
export async function revertToRecipeVersion(
    currentUser: SessionUser,
    recipeId: number,
    versionId: number
) {
    // 🚨 GUARDRAIL OUTSIDE THE TRY/CATCH 🚨
    await assertUserAccess(currentUser, [Role.restaurant_owner], currentUser.restaurantId);

    if (!currentUser.restaurantId) {
        throw new Error("Security Violation: No tenant context found.");
    }

    try {
        const versionRecord = await prisma.recipeVersion.findFirst({
            where: {
                id: versionId,
                recipe_id: recipeId,
                recipe: { restaurant_id: currentUser.restaurantId }
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
                    status: RecipeStatus.PENDING, // Demote to pending for auditor re-verification
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

                // Fallback: If snapshot is from the seeded structure, resolve reference ID dynamically by name
                if (!resolvedIngredientId && ing.name) {
                    const ref = await tx.ingredientReference.findFirst({
                        where: { name: ing.name },
                        select: { id: true },
                    });
                    if (ref) {
                        resolvedIngredientId = ref.id;
                    }
                }

                if (!resolvedIngredientId) {
                    throw new Error(`Failed to resolve ingredient reference context for: "${ing.name || "Unknown"}"`);
                }

                const statedAmount = ing.user_stated_amount || ing.amount || "1 unit";

                // Read from either live grams or seed weight
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

            // 4. Log compliance reversion events
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
        revalidatePath(`/recipes/${recipeId}`);
        return { success: true, message: "Recipe reverted successfully. Pending for Re-verification" };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to roll back recipe version.";
        return { success: false, message: errorMessage };
    }
}

/**
 * Updates an existing recipe, executes the Math Guardrail,
 * aggregates allergens, and demotes status back to PENDING.
 */
export async function updateRecipe(
    currentUser: SessionUser,
    recipeId: number,
    payload: UpdateRecipePayload
) {
    await assertUserAccess(currentUser, [Role.restaurant_owner], currentUser.restaurantId);

    if (!currentUser.restaurantId) {
        throw new Error("Security Violation: No tenant context found.");
    }

    // 🛡️ Zod Validation
    const validated = updateRecipeSchema.safeParse(payload);
    if (!validated.success) return { success: false, message: validated.error.issues[0].message };
    const validData = validated.data;

    try {
        const ingredientRefs = await prisma.ingredientReference.findMany({
            where: { id: { in: validData.ingredients.map((i) => i.ingredient_id) } },
        });

        const totals = calculateServerRecipeTotals(validData.ingredients, ingredientRefs);

        await prisma.$transaction(async (tx) => {
            await tx.recipeIngredient.deleteMany({ where: { recipe_id: recipeId } });

            for (const rawIng of validData.ingredients) {
                await tx.recipeIngredient.create({
                    data: {
                        recipe_id: recipeId,
                        ingredient_id: rawIng.ingredient_id,
                        user_stated_amount: rawIng.user_stated_amount,
                        normalized_grams: new Prisma.Decimal(rawIng.normalized_grams),
                    },
                });
            }

            await tx.recipe.update({
                where: { id: recipeId },
                data: {
                    meal_name: validData.meal_name,
                    preparation_notes: validData.preparation_notes,
                    image_url: validData.image_url,
                    calories: totals.calories,
                    protein: totals.protein,
                    carbs: totals.carbs,
                    total_fat: totals.total_fat,
                    detected_allergens: totals.detected_allergens,
                    status: RecipeStatus.PENDING,
                    rejection_reason: null,
                },
            });

            await tx.auditLog.create({
                data: {
                    actor_id: currentUser.id,
                    restaurant_id: currentUser.restaurantId!,
                    recipe_id: recipeId,
                    action: "RECIPE_UPDATED_BY_OWNER",
                    payload: JSON.parse(
                        JSON.stringify({
                            meal_name: validData.meal_name,
                            calories: totals.calories,
                        })
                    ),
                },
            });
        });

        revalidatePath(`/owner/recipes/${recipeId}`);
        revalidatePath("/owner/recipes");

        return { success: true, message: "Recipe updated successfully. Pending re-verification." };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to update recipe.";
        return { success: false, message: errorMessage };
    }
}