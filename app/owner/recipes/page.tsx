import React from "react";
import { redirect } from "next/navigation";
import { getOwnerRecipes } from "@/actions/RecipesActions";
import { RecipeFilters } from "@/components/owner/recipe-filters";
import { StatusBadge } from "@/components/shared/status-badge";
import { assertUserAccess } from "@/lib/security";
import { Role, RecipeStatus } from "@prisma/client";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Shadcn UI & Icons
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Plus, FileText, Eye } from "lucide-react";

interface PageProps {
    searchParams: Promise<{
        status?: string;
        search?: string;
        page?: string;
    }>;
}

export default async function RecipesPage({ searchParams }: PageProps) {
    const currentUser = await getSession();
    if (!currentUser) redirect("/login");

    await assertUserAccess(currentUser, [Role.restaurant_owner], currentUser.restaurantId);

    const params = await searchParams;
    const currentStatus = params.status as RecipeStatus | undefined;
    const searchQuery = params.search || "";
    const currentPage = Number(params.page) || 1;

    const response = await getOwnerRecipes(currentUser, {
        status: currentStatus,
        search: searchQuery,
        page: currentPage,
        limit: 10,
    });

    if (!response.success || !response.data) {
        return (
            <div className="container mx-auto px-4 md:px-8 py-8">
                <Alert variant="destructive" className="max-w-2xl">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Retrieval Fault</AlertTitle>
                    <AlertDescription>{response.message}</AlertDescription>
                </Alert>
            </div>
        );
    }

    const { recipes, totalCount, totalPages } = response.data;

    return (
        <div className="container mx-auto px-4 md:px-8 py-6 space-y-6 bg-background">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0 pb-4 border-b border-border">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Menu Portfolio</h1>
                    <p className="text-muted-foreground mt-1">
                        Publish, trace, and audit registered restaurant menu options and nutrition metrics.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/owner/drafts"
                        className={buttonVariants({ variant: "outline" })}
                    >
                        <FileText className="mr-2 h-4 w-4" />
                        Check Draft Queue
                    </Link>
                    <Link
                        href="/owner/submit"
                        className={buttonVariants({ variant: "default" })}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Ingest Recipe Notes
                    </Link>
                </div>
            </div>

            {/* Filters and Search Bar Component */}
            <RecipeFilters currentStatus={currentStatus} currentSearch={searchQuery} />

            {/* Modern Table Layout */}
            <div className="rounded-md border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="font-semibold">Meal Name</TableHead>
                            <TableHead className="font-semibold">Calories</TableHead>
                            <TableHead className="font-semibold">Macros (P / C / F)</TableHead>
                            <TableHead className="font-semibold">Allergens Identified</TableHead>
                            <TableHead className="font-semibold">Status</TableHead>
                            <TableHead className="text-right font-semibold">Audit Logs</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recipes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    No recipes have been registered matching the search query parameters.
                                </TableCell>
                            </TableRow>
                        ) : (
                            recipes.map((recipe: any) => (
                                <TableRow key={recipe.id} className="transition-colors hover:bg-muted/50">
                                    <TableCell className="font-medium text-foreground">
                                        {recipe.meal_name}
                                    </TableCell>
                                    <TableCell className="  text-muted-foreground">
                                        {Number(recipe.calories)} kcal
                                    </TableCell>
                                    <TableCell className="  text-muted-foreground">
                                        {Number(recipe.protein)}g / {Number(recipe.carbs)}g / {Number(recipe.total_fat)}g
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {recipe.detected_allergens?.length === 0 ? (
                                                <span className="text-xs text-muted-foreground italic">None</span>
                                            ) : (
                                                recipe.detected_allergens?.map((all: string) => (
                                                    <Badge
                                                        key={all}
                                                        variant="destructive"
                                                        className="text-[10px] uppercase tracking-wider bg-destructive/10 text-destructive hover:bg-destructive/20 border-transparent"
                                                    >
                                                        {all}
                                                    </Badge>
                                                ))
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={recipe.status} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Link
                                            href={`/owner/recipes/${recipe.id}`}
                                            className={buttonVariants({ variant: "secondary", size: "sm" })}
                                        >
                                            <Eye className="mr-2 h-3 w-3" />
                                            Inspect
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Modern Pagination Control */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground font-medium">
                    Page {currentPage} of {totalPages || 1} ({totalCount} entries)
                </p>
                <div className="flex items-center space-x-2">
                    <Link
                        href={`/owner/recipes?page=${currentPage - 1}${currentStatus ? `&status=${currentStatus}` : ""}${searchQuery ? `&search=${searchQuery}` : ""}`}
                        className={cn(
                            buttonVariants({ variant: "outline", size: "sm" }),
                            currentPage <= 1 && "pointer-events-none opacity-50"
                        )}
                    >
                        Previous
                    </Link>
                    <Link
                        href={`/owner/recipes?page=${currentPage + 1}${currentStatus ? `&status=${currentStatus}` : ""}${searchQuery ? `&search=${searchQuery}` : ""}`}
                        className={cn(
                            buttonVariants({ variant: "outline", size: "sm" }),
                            currentPage >= totalPages && "pointer-events-none opacity-50"
                        )}
                    >
                        Next
                    </Link>
                </div>
            </div>
        </div>
    );
}