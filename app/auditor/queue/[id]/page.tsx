// app/auditor/queue/[id]/page.tsx
import React from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAuditorAuth } from "@/lib/Authentication/RequireAuditorAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import {RecipeReviewForm} from "@/components/auditor/recipe-review-form";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function RecipeReviewPage({ params }: PageProps) {
    await requireAuditorAuth();

    const { id } = await params;
    const recipeId = parseInt(id, 10);
    if (isNaN(recipeId)) return notFound();

    const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
        include: {
            restaurant: { select: { business_name: true, slug: true } },
            ingredients: { include: { ingredient_item: true } },
        },
    });

    if (!recipe) return notFound();
    if (recipe.status !== "PENDING") {
        // Already reviewed – redirect to queue
        redirect("/auditor/queue");
    }

    return (
        <div className="flex flex-col gap-6 px-4 lg:px-6 py-4">
            <div className="flex items-center gap-4">
                <Link href="/auditor/queue">
                    <Button variant="outline" size="sm" className="gap-2">
                        <ArrowLeft className="h-4 w-4" /> Back to Queue
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold tracking-tight">Review Recipe</h1>
                <StatusBadge status={recipe.status} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main form */}
                <div className="md:col-span-2">
                    <RecipeReviewForm recipe={recipe} />
                </div>

                {/* Sidebar info */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Restaurant</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm">
                            <p className="font-semibold">{recipe.restaurant?.business_name}</p>
                            <p className="text-muted-foreground">Slug: {recipe.restaurant?.slug}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm">
                            <p className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {new Date(recipe.created_at).toLocaleDateString()}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Macros</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            {/* 🚨 Converted Prisma Decimals to strings here */}
                            <div className="flex justify-between"><span>Calories</span><span className="font-bold">{recipe.calories.toString()}</span></div>
                            <div className="flex justify-between"><span className="text-protein">Protein</span><span className="font-bold text-protein">{recipe.protein.toString()}g</span></div>
                            <div className="flex justify-between"><span className="text-carbs">Carbs</span><span className="font-bold text-carbs">{recipe.carbs.toString()}g</span></div>
                            <div className="flex justify-between"><span className="text-fats">Fat</span><span className="font-bold text-fats">{recipe.total_fat.toString()}g</span></div>
                        </CardContent>
                    </Card>

                    {recipe.detected_allergens.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium">Allergens</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-1">
                                    {recipe.detected_allergens.map((a) => (
                                        <span key={a} className="bg-destructive/10 text-destructive px-2 py-0.5 rounded-full text-xs">{a}</span>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}