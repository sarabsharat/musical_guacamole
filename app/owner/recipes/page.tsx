import { requireOwnerAuth } from "@/lib/Authentication/RequireOwnerAuth";
import { getOwnerRecipes, getAllergens } from "@/actions/RecipesActions";
import { RecipeFilters } from "@/components/owner/recipe-filters";
import { RecipesList} from "@/components/owner/recipes-list";
import { RecipeStatus } from "@prisma/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, AlertCircle } from "lucide-react";

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

    // 🚀 OPTIMIZATION: Fetch allergens and recipes at the exact same time!
    const [allAllergens, result] = await Promise.all([
        getAllergens(),
        getOwnerRecipes({
            page,
            limit: 10,
            search,
            status,
            allergens,
            calMin,
            calMax,
        })
    ]);

    // 🎨 UI UPDATE: Cohesive Error State
    if (!result.success || !result.data) {
        return (
            <main className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">All Recipes</h1>
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        {result.message || "Failed to load recipes. Please try again later."}
                    </AlertDescription>
                </Alert>
            </main>
        );
    }

    const { recipes, totalCount, totalPages } = result.data;

    // 🎨 UI UPDATE: Standardized wrapper padding and spacing
    return (
        <main className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">

            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        All Recipes
                    </h1>
                    <p className="text-base text-muted-foreground mt-1">
                        {totalCount} recipe{totalCount !== 1 ? "s" : ""} found
                    </p>
                </div>
                <Link href="/owner/submit">
                    <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-base px-6 py-3 h-auto">
                        <Plus className="h-5 w-5" />
                        New Recipe
                    </Button>
                </Link>
            </header>

            {/* Filters */}
            <RecipeFilters
                currentStatus={status}
                currentSearch={search}
                currentAllergens={allergens || []}
                currentCaloriesMin={calMin}
                currentCaloriesMax={calMax}
                allAllergens={allAllergens}
            />

            {/* Reusable Data Table component inside Card */}
            <Card className="border-border shadow-sm">
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
        </main>
    );
}