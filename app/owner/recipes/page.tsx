import { prisma } from "@/lib/prisma";
import { requireOwnerAuth } from "@/lib/Authentication/RequireOwnerAuth";
import { RecipeFilters } from "@/components/owner/recipe-filters";
import { serializePrisma } from "@/lib/serialize";
import { RecipeStatus } from "@prisma/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { RecipesList } from "@/components/owner/recipes-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PageProps {
    searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}

export default async function RecipesPage({ searchParams }: PageProps) {
    const { restaurantId } = await requireOwnerAuth();
    const params = await searchParams;
    const page = parseInt(params.page || "1", 10);
    const pageSize = 10;
    const skip = (page - 1) * pageSize;
    const search = params.search || "";
    const status = params.status as RecipeStatus | undefined;

    const where: any = { restaurant_id: restaurantId };
    if (search) where.meal_name = { contains: search, mode: "insensitive" };
    if (status) where.status = status;

    const [recipes, totalCount] = await Promise.all([
        prisma.recipe.findMany({ where, orderBy: { id: "desc" }, skip, take: pageSize }),
        prisma.recipe.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="flex flex-col gap-6 px-4 lg:px-6 py-4">
            {/* ─── Header ─────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">All Recipes</h1>
                    <p className="text-base text-muted-foreground">
                        {totalCount} recipe{totalCount !== 1 ? "s" : ""} found
                    </p>
                </div>
                <Link href="/owner/submit">
                    <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-base px-6 py-3 h-auto">
                        <Plus className="h-5 w-5" />
                        New Recipe
                    </Button>
                </Link>
            </div>

            {/* ─── Filter Bar ────────────────────────────────────────── */}
            <RecipeFilters currentStatus={status} currentSearch={search} />

            {/* ─── Recipes List (wrapped in a Card) ────────────────── */}
            <Card className="border-border">
                <CardHeader>
                    <CardTitle>Recipes</CardTitle>
                </CardHeader>
                <CardContent>
                    <RecipesList
                        recipes={serializePrisma(recipes)}
                        currentPage={page}
                        totalPages={totalPages}
                    />
                </CardContent>
            </Card>
        </div>
    );
}