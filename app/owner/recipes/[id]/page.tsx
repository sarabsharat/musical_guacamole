// src/app/owner/recipes/[id]/page.tsx
import React from "react";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serializePrisma } from "@/lib/serialize";
import { getSession, assertUserAccess } from "@/lib/security";
import { StatusBadge } from "@/components/shared/status-badge";
import { revertToRecipeVersion } from "@/actions/RecipesActions";
import { Role } from "@prisma/client";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Shadcn UI & Icons
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, History, ImageIcon, Pencil, Utensils, Scale } from "lucide-react";

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function RecipeDetailPage({ params }: PageProps) {
    // 1. Fetch user session
    const currentUser = await getSession();

    // 2. SECURITY: Ensure owner is logged in and belongs to this tenant
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

    // 5. Server Action wrapper to handle Rollback trigger
    async function handleRollback(formData: FormData) {
        "use server";
        const versionIdStr = formData.get("versionId")?.toString();
        if (!versionIdStr) return;

        const versionId = parseInt(versionIdStr, 10);
        const res = await revertToRecipeVersion(currentUser!, recipeId, versionId);

        if (res.success) {
            redirect(`/recipes/${recipeId}`);
        }
    }

    // Check if the recipe is in a state that allows editing
    const isEditable = serializedRecipe.status === "REJECTED" || serializedRecipe.status === "REVOKED";

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 bg-background">

            {/* Breadcrumb & Navigation */}
            <div className="flex items-center text-sm text-muted-foreground mb-4">
                <Link href="/owner/recipes" className="hover:text-foreground transition-colors flex items-center">
                    <ChevronLeft className="mr-1 h-4 w-4" /> Menu Portfolio
                </Link>
                <span className="mx-2">/</span>
                <span className="text-foreground font-medium">Recipe Audit File #{serializedRecipe.id}</span>
            </div>

            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b pb-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">
                            {serializedRecipe.meal_name}
                        </h1>
                        <StatusBadge status={serializedRecipe.status} />
                    </div>
                    {serializedRecipe.preparation_notes && (
                        <p className="text-muted-foreground italic">
                            &ldquo;{serializedRecipe.preparation_notes}&rdquo;
                        </p>
                    )}
                </div>

                {/* Unified Edit Action */}
                <div className="flex gap-2 shrink-0">
                    {isEditable && (
                        <Link
                            href={`/owner/recipes/${serializedRecipe.id}/edit`}
                            className={buttonVariants({ variant: "default" })}
                        >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit Recipe
                        </Link>
                    )}
                </div>
            </div>

            {/* Main Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column (2/3 width): Nutrition & Ingredients */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Macros Panel */}
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center text-lg">
                                <Scale className="mr-2 h-5 w-5 text-muted-foreground" />
                                Active Nutrition Ledger
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 rounded-lg border bg-muted/50 p-4">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Calories</p>
                                    <p className="text-2xl font-bold">{Number(serializedRecipe.calories)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Protein</p>
                                    <p className="text-2xl font-bold">{Number(serializedRecipe.protein)}g</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Carbs</p>
                                    <p className="text-2xl font-bold">{Number(serializedRecipe.carbs)}g</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Total Fat</p>
                                    <p className="text-2xl font-bold">{Number(serializedRecipe.total_fat)}g</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Ingredients List */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center text-lg">
                                <Utensils className="mr-2 h-5 w-5 text-muted-foreground" />
                                Ingredient Composition
                            </CardTitle>
                            <CardDescription>Verified components and calculated macros</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {serializedRecipe.ingredients.map((ing: any, index: number) => (
                                <React.Fragment key={ing.id}>
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div className="space-y-1">
                                            <p className="font-semibold text-foreground">
                                                {ing.ingredient_item.name}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                Stated: {ing.user_stated_amount}
                                            </p>
                                        </div>
                                        <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1 text-sm text-right">
                                            <span className="  bg-muted px-2 py-1 rounded-md">
                                                {Number(ing.normalized_grams)}g
                                            </span>
                                            <span className="text-muted-foreground">
                                                {(Number(ing.ingredient_item.calories_per_g) * Number(ing.normalized_grams)).toFixed(1)} kcal
                                            </span>
                                        </div>
                                    </div>
                                    {index !== serializedRecipe.ingredients.length - 1 && <Separator />}
                                </React.Fragment>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column (1/3 width): Visuals & History */}
                <div className="lg:col-span-1 space-y-6">

                    {/* Visual Reference */}
                    {serializedRecipe.image_url && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center text-sm font-medium">
                                    <ImageIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                    Visual Reference
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={serializedRecipe.image_url}
                                        alt={serializedRecipe.meal_name}
                                        className="absolute inset-0 w-full h-full object-cover"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Version History */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center text-sm font-medium">
                                <History className="mr-2 h-4 w-4 text-muted-foreground" />
                                Compliance History
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Rollback resets the active state to PENDING.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {serializedRecipe.versions.length === 0 ? (
                                    <p className="text-sm text-muted-foreground italic text-center py-4 border-2 border-dashed rounded-md">
                                        No approved snapshots exist.
                                    </p>
                                ) : (
                                    serializedRecipe.versions.map((ver: any) => (
                                        <div key={ver.id} className="flex flex-col gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                                            <div>
                                                <p className="text-sm font-semibold">Snapshot #{ver.id}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {new Date(ver.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                            <form action={handleRollback} className="w-full">
                                                <input type="hidden" name="versionId" value={ver.id} />
                                                <Button
                                                    type="submit"
                                                    variant="secondary"
                                                    size="sm"
                                                    className="w-full"
                                                >
                                                    <History className="mr-2 h-3 w-3" />
                                                    Revert to this version
                                                </Button>
                                            </form>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}