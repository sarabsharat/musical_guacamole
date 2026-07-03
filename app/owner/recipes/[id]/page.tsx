// src/app/owner/recipes.ts/[id]/page.tsx.tsx
import React from "react";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serializePrisma } from "@/lib/serialize";
import { getSession, assertUserAccess } from "@/lib/security";
import { StatusBadge } from "@/components/shared/status-badge";
import { revertToRecipeVersion } from "@/actions/owner-recipes";
import { Role } from "@prisma/client";
import Link from "next/link";

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function RecipeDetailPage({ params }: PageProps) {
    // 1. Fetch user session
    const currentUser = await getSession();

    // 2. 🚨 SECURITY: Ensure owner is logged in and belongs to this tenant [3]
    await assertUserAccess(currentUser, [Role.restaurant_owner], currentUser?.restaurantId);

    // 3. Resolve dynamic ID
    const { id } = await params;
    const recipeId = parseInt(id, 10);

    if (isNaN(recipeId)) {
        return notFound();
    }

    // 4. Query Recipe with Double Security (ID + Tenant filtering)
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
            versions: {
                orderBy: { created_at: "desc" },
            },
        },
    });

    if (!recipe) {
        return notFound();
    }

    const serializedRecipe = serializePrisma(recipe);

    // 5. Server Action wrapper to handle Rollback trigger (React 19 / Next.js 15+ compatible)
    async function handleRollback(formData: FormData) {
        "use server";
        const versionIdStr = formData.get("versionId")?.toString();
        if (!versionIdStr) return;

        const versionId = parseInt(versionIdStr, 10);
        const res = await revertToRecipeVersion(currentUser!, recipeId, versionId);

        if (res.success) {
            redirect(`/owner/recipes/${recipeId}`);
        }
    }

    return (
        <div className="min-h-screen bg-neutral-100 p-4 sm:p-8 text-black font-mono">
            <div className="mx-auto max-w-5xl border-4 border-black bg-white p-6 rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6">

                {/* Navigation Header */}
                <div className="mb-4 font-mono text-xs uppercase flex space-x-2 border-b-2 border-black pb-2">
                    <Link href="/owner/recipes" className="underline hover:text-red-500">Menu Portfolio</Link>
                    <span>/</span>
                    <span className="text-neutral-500">Recipe Audit File #{serializedRecipe.id}</span>
                </div>

                {/* Main layout grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* Left Column: Details, Nutrition, and Ingredients */}
                    <div className="lg:col-span-7 space-y-6">

                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <span className="bg-black text-white px-2 py-0.5 text-xs font-bold uppercase rounded-none">
                                    Meal Record File
                                </span>
                                <StatusBadge status={serializedRecipe.status} />

                                {/* ADDED EDIT ACTION FOR THE OWNER */}
                                {(serializedRecipe.status === "REJECTED" || serializedRecipe.status === "REVOKED") &&(<Link
                                        href={`/owner/recipes/${serializedRecipe.id}/edit`}
                                        className="bg-yellow-400 hover:bg-black hover:text-white border-2 border-black font-extrabold uppercase text-[10px] px-2.5 py-0.5 rounded-none transition"
                                    >
                                        Edit Recipe
                                    </Link>
                                )}
                            </div>

                            {/* RESTORED MISSING TITLE AND NOTES */}
                            <h1 className="text-3xl font-extrabold uppercase tracking-tight">
                                {serializedRecipe.meal_name}
                            </h1>
                            <p className="text-xs text-neutral-500 italic bg-neutral-50 p-3 border border-neutral-300">
                                &ldquo;{serializedRecipe.preparation_notes}&rdquo;
                            </p>
                        </div> {/* THIS WAS THE MISSING CLOSING TAG */}

                        {/* Macros Panel */}
                        <div className="border-4 border-black p-4 bg-neutral-50 rounded-none space-y-4">
                            <h2 className="text-sm font-extrabold uppercase border-b-2 border-black pb-1">
                                Active Nutrition Ledger
                            </h2>
                            <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                <div className="border-2 border-black p-2 bg-white">
                                    <div className="text-[9px] uppercase text-neutral-400">Calories</div>
                                    <div className="text-sm font-extrabold">{serializedRecipe.calories} kcal</div>
                                </div>
                                <div className="border-2 border-black p-2 bg-white">
                                    <div className="text-[9px] uppercase text-neutral-400">Protein</div>
                                    <div className="text-sm font-extrabold">{serializedRecipe.protein}g</div>
                                </div>
                                <div className="border-2 border-black p-2 bg-white">
                                    <div className="text-[9px] uppercase text-neutral-400">Carbs</div>
                                    <div className="text-sm font-extrabold">{serializedRecipe.carbs}g</div>
                                </div>
                                <div className="border-2 border-black p-2 bg-white">
                                    <div className="text-[9px] uppercase text-neutral-400">Total Fat</div>
                                    <div className="text-sm font-extrabold">{serializedRecipe.total_fat}g</div>
                                </div>
                            </div>
                        </div>

                        {/* Active Ingredients List */}
                        <div className="border-4 border-black p-4 bg-white rounded-none space-y-3">
                            <h3 className="text-sm font-bold uppercase border-b-2 border-black pb-1">
                                Ingredient Composition
                            </h3>
                            <div className="space-y-2">
                                {serializedRecipe.ingredients.map((ing: any) => (
                                    <div key={ing.id} className="border-2 border-black p-3 text-xs flex justify-between items-center rounded-none bg-neutral-50">
                                        <div>
                                            <div className="font-bold uppercase">{ing.ingredient_item.name}</div>
                                            <div className="text-[10px] text-neutral-400 mt-1">
                                                Stated Amount: &ldquo;{ing.user_stated_amount}&rdquo;
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-extrabold">{ing.normalized_grams}g</div>
                                            <div className="text-[9px] text-neutral-500 mt-1 font-bold">
                                                {(ing.ingredient_item.calories_per_g * ing.normalized_grams).toFixed(1)} kcal
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Visual Reference and Snapshots */}
                    <div className="lg:col-span-5 space-y-6">

                        {serializedRecipe.image_url && (
                            <div className="border-4 border-black p-2 bg-neutral-50 rounded-none">
                                <h4 className="text-xs font-bold uppercase mb-2">Registered Image Reference</h4>
                                <div className="w-full h-48 border-2 border-black overflow-hidden relative">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={serializedRecipe.image_url}
                                        alt={serializedRecipe.meal_name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>
                        )}
                        <Link
                            href={`/owner/recipes/${serializedRecipe.id}/edit`}
                            className="bg-yellow-400 hover:bg-black hover:text-white border-2 border-black font-extrabold uppercase text-[10px] px-2.5 py-0.5 rounded-none transition"
                        >
                            Edit Recipe
                        </Link>

                        {/* Compliance Version Control Rollbacks */}
                        <div className="border-4 border-black p-4 bg-white rounded-none space-y-4">
                            <div className="border-b-2 border-black pb-2">
                                <h3 className="text-sm font-bold uppercase">Compliance Version History</h3>
                                <p className="text-[10px] text-neutral-500 mt-1 leading-tight">
                                    Rolling back to an approved historical snapshot reverts active ingredients and resets the compliance state to PENDING.
                                </p>
                            </div>

                            <div className="space-y-3">
                                {serializedRecipe.versions.length === 0 ? (
                                    <div className="text-xs text-neutral-500 italic py-2">
                                        No approved versions are recorded in this recipe's ledger yet.
                                    </div>
                                ) : (
                                    serializedRecipe.versions.map((ver: any) => (
                                        <div key={ver.id} className="border-2 border-black p-3 bg-neutral-50 rounded-none flex justify-between items-center text-xs">
                                            <div>
                                                <div className="font-extrabold uppercase">Approved Snapshot #{ver.id}</div>
                                                <div className="text-[10px] text-neutral-500 mt-1">
                                                    Saved: {new Date(ver.created_at).toLocaleString()}
                                                </div>
                                            </div>

                                            <form action={handleRollback}>
                                                <input type="hidden" name="versionId" value={ver.id} />
                                                <button
                                                    type="submit"
                                                    className="bg-black hover:bg-neutral-800 text-white border border-black font-bold uppercase text-[10px] px-2.5 py-1.5 rounded-none transition"
                                                >
                                                    Revert
                                                </button>
                                            </form>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                    </div>

                </div>

            </div>
        </div>
    );
}