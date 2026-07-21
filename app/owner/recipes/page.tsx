import { requireOwnerAuth } from "@/lib/Authentication/RequireOwnerAuth";
import { getOwnerRecipes, getAllergens } from "@/actions/RecipesActions";
import { RecipeFilters } from "@/components/owner/recipe-filters";
import { RecipeStatus } from "@prisma/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { RecipesList } from "@/components/owner/recipes-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PageProps {
    searchParams: Promise<{ page?: string; search?: string; status?: string; allergens?: string; calMin?: string; calMax?: string }>;
}

export default async function RecipesPage({ searchParams }: PageProps) {
    await requireOwnerAuth();

    const params = await searchParams;
    const page = parseInt(params.page || "1", 10);
    const search = params.search || "";
    const status = params.status as RecipeStatus | undefined;
    const allergens = params.allergens ? params.allergens.split(",") : undefined;
    const calMin = params.calMin ? parseInt(params.calMin) : undefined;
    const calMax = params.calMax ? parseInt(params.calMax) : undefined;

    // Fetch all allergens for the filter dropdown
    const allAllergens = await getAllergens();

    const result = await getOwnerRecipes({
        page,
        limit: 10,
        search,
        status,
        allergens,
        calMin,
        calMax,
    });

    if (!result.success) {
        return (
            <div className="flex flex-col gap-6 px-4 lg:px-6 py-4">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">All Recipes</h1>
                <p className="text-destructive">Failed to load recipes. Please try again later.</p>
            </div>
        );
    }

    const { recipes, totalCount, totalPages } = result.data;

    return (
        <div className="flex flex-col gap-6 px-4 lg:px-6 py-4">
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

            <RecipeFilters
                currentStatus={status}
                currentSearch={search}
                currentAllergens={allergens || []}
                currentCaloriesMin={calMin}
                currentCaloriesMax={calMax}
                allAllergens={allAllergens}
            />

            <Card className="border-border">
                <CardHeader>
                    <CardTitle>Recipes</CardTitle>
                </CardHeader>
                <CardContent>
                    <RecipesList
                        recipes={recipes}
                        currentPage={page}
                        totalPages={totalPages}
                    />
                </CardContent>
            </Card>
        </div>
    );
}