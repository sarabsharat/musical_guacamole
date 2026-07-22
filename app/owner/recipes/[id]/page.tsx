// src/app/owner/recipes/[id]/page.tsx
import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOwnerAuth } from "@/lib/Authentication/RequireOwnerAuth";
import { StatusBadge } from "@/components/shared/status-badge";

// Shadcn UI & Icons
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, ChefHat, Info, Activity, MessageSquareWarning } from "lucide-react";
import {getRecipeClarifications} from "@/actions/RecipesActions";

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function RecipeDetailPage({ params }: PageProps) {
    // 1. 🚨 SECURITY: Auth Wall
    const { restaurantId } = await requireOwnerAuth();

    // 2. Resolve dynamic parameters safely
    const { id } = await params;
    const recipeId = parseInt(id, 10);

    if (isNaN(recipeId)) {
        return notFound();
    }

    // 3. 🚨 SECURITY: Tenant Isolation (Locked to their restaurantId)
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

    // 4. Fetch clarifications for this recipe
    const clarifications = await getRecipeClarifications(recipeId);

    return (
        <div className="container mx-auto px-4 md:px-8 py-6 space-y-6 bg-background">
            {/* Navigation & Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-border">
                <div className="space-y-1">
                    <Link
                        href="/owner/recipes"
                        className="text-sm text-muted-foreground hover:text-foreground flex items-center transition-colors mb-2"
                    >
                        <ArrowLeft className="mr-1 h-4 w-4" /> Back to Menu Portfolio
                    </Link>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight">{recipe.meal_name}</h1>
                        <StatusBadge status={recipe.status} />
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link href={`/owner/recipes/${recipe.id}/edit`} className={buttonVariants({ variant: "default" })}>
                        <Edit className="mr-2 h-4 w-4" /> Edit Recipe
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Image & Prep Notes */}
                <div className="md:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <ChefHat className="h-5 w-5 text-muted-foreground" />
                                Preparation
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {recipe.image_url ? (
                                <div className="rounded-md overflow-hidden border">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={recipe.image_url}
                                        alt={recipe.meal_name}
                                        className="w-full h-48 object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="w-full h-32 bg-muted flex items-center justify-center rounded-md border border-dashed">
                                    <span className="text-muted-foreground text-sm">No image provided</span>
                                </div>
                            )}
                            <div>
                                <h4 className="font-semibold text-sm mb-1">Chef's Notes:</h4>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {recipe.preparation_notes || "No preparation notes recorded."}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Allergens Card */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Info className="h-5 w-5 text-muted-foreground" />
                                Detected Allergens
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {recipe.detected_allergens && recipe.detected_allergens.length > 0 ? (
                                    recipe.detected_allergens.map((allergen: string) => (
                                        <Badge key={allergen} variant="destructive" className="uppercase tracking-wide">
                                            {allergen}
                                        </Badge>
                                    ))
                                ) : (
                                    <span className="text-sm text-muted-foreground italic">No allergens detected.</span>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Macros, Clarifications, & Ingredients */}
                <div className="md:col-span-2 space-y-6">
                    {/* Macro Overview */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Activity className="h-5 w-5 text-muted-foreground" />
                                Nutritional Profile
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 bg-muted/50 rounded-lg border text-center">
                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Calories</p>
                                    <p className="text-2xl font-black">{Number(recipe.calories)}</p>
                                </div>
                                <div className="p-4 bg-blue-500/10 border-blue-200 text-blue-900 dark:text-blue-300 rounded-lg border text-center">
                                    <p className="text-xs uppercase font-bold tracking-wider mb-1">Protein</p>
                                    <p className="text-2xl font-black">{Number(recipe.protein)}g</p>
                                </div>
                                <div className="p-4 bg-amber-500/10 border-amber-200 text-amber-900 dark:text-amber-300 rounded-lg border text-center">
                                    <p className="text-xs uppercase font-bold tracking-wider mb-1">Carbs</p>
                                    <p className="text-2xl font-black">{Number(recipe.carbs)}g</p>
                                </div>
                                <div className="p-4 bg-red-500/10 border-red-200 text-red-900 dark:text-red-300 rounded-lg border text-center">
                                    <p className="text-xs uppercase font-bold tracking-wider mb-1">Fat</p>
                                    <p className="text-2xl font-black">{Number(recipe.total_fat)}g</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ─── Clarifications Card ────────────────────────── */}
                    {clarifications.length > 0 && (
                        <Card className="border-carbs/30 bg-carbs/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-carbs-foreground">
                                    <MessageSquareWarning className="h-5 w-5" />
                                    Clarifications Requested
                                </CardTitle>
                                <CardDescription>
                                    Your auditor has requested additional information.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {clarifications.map((c) => (
                                    <div key={c.id} className="border-b border-carbs/20 pb-2 last:border-0">
                                        <p className="text-sm text-foreground">{c.message}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Requested by {c.requestedBy} on {new Date(c.requestedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* Ingredients Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Ingredients Breakdown</CardTitle>
                            <CardDescription>Verified components mapped to JFDA global standards.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead className="font-semibold">Ingredient Component</TableHead>
                                            <TableHead className="font-semibold">Stated Amount</TableHead>
                                            <TableHead className="font-semibold text-right">Weight (g)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recipe.ingredients.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                                                    No ingredients linked to this recipe.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            recipe.ingredients.map((ing: any) => (
                                                <TableRow key={ing.id}>
                                                    <TableCell className="font-medium">
                                                        {ing.ingredient_item?.name || "Unknown Item"}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground text-sm">
                                                        {ing.user_stated_amount || "-"}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-sm">
                                                        {Number(ing.normalized_grams)}g
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}