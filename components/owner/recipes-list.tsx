"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { Eye, Edit, FileText, Plus } from "lucide-react";
import {StatusBadge} from "@/components/shared/status-badge";

interface Recipe {
    id: number;
    meal_name: string;
    status: string;
    calories: number;
    protein: number;
    carbs: number;
    total_fat: number;
    created_at: Date;
}

interface RecipesListProps {
    recipes: Recipe[];
    currentPage: number;
    totalPages: number;
}



export function RecipesList({ recipes, currentPage, totalPages }: RecipesListProps) {
    const router = useRouter();

    const goToPage = (page: number) => {
        router.push(`/owner/recipes?page=${page}`);
    };

    if (recipes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center transition-colors hover:bg-muted/30">
                <div className="rounded-full bg-primary/10 p-4">
                    <FileText className="h-8 w-8 text-primary" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">No recipes yet</h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    Start building your recipe portfolio by adding your first menu item.
                </p>
                <Link href="/owner/submit" className="mt-6">
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        Create Recipe
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableHead className="h-12 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                Meal Name
                            </TableHead>
                            <TableHead className="h-12 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                Status
                            </TableHead>
                            <TableHead className="h-12 text-right text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                Calories
                            </TableHead>
                            <TableHead className="h-12 text-right text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                Protein <span className="text-protein">●</span>
                            </TableHead>
                            <TableHead className="h-12 text-right text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                Carbs <span className="text-carbs">●</span>
                            </TableHead>
                            <TableHead className="h-12 text-right text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                Fat <span className="text-fats">●</span>
                            </TableHead>
                            <TableHead className="h-12 text-right text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recipes.map((recipe) => (
                            <TableRow
                                key={recipe.id}
                                className="border-b border-border/50 transition-colors hover:bg-muted/40"
                            >
                                <TableCell className="py-3 text-base font-medium text-foreground">
                                    {recipe.meal_name}
                                </TableCell>
                                <TableCell className="py-3">
                                    <StatusBadge status={recipe.status} />
                                </TableCell>
                                <TableCell className="py-3 text-right text-base tabular-nums text-foreground">
                                    {recipe.calories?.toFixed(0) || "—"}
                                </TableCell>
                                <TableCell className="py-3 text-right text-base tabular-nums text-protein font-medium">
                                    {recipe.protein?.toFixed(1) || "—"}g
                                </TableCell>
                                <TableCell className="py-3 text-right text-base tabular-nums text-carbs font-medium">
                                    {recipe.carbs?.toFixed(1) || "—"}g
                                </TableCell>
                                <TableCell className="py-3 text-right text-base tabular-nums text-fats font-medium">
                                    {recipe.total_fat?.toFixed(1) || "—"}g
                                </TableCell>
                                <TableCell className="py-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Link href={`/owner/recipes/${recipe.id}`}>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted"
                                            >
                                                <Eye className="h-4 w-4" />
                                                <span className="sr-only">View {recipe.meal_name}</span>
                                            </Button>
                                        </Link>
                                        <Link href={`/owner/recipes/${recipe.id}/edit`}>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted"
                                            >
                                                <Edit className="h-4 w-4" />
                                                <span className="sr-only">Edit {recipe.meal_name}</span>
                                            </Button>
                                        </Link>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {totalPages > 1 && (
                <Pagination className="pt-2">
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                onClick={() => currentPage > 1 && goToPage(currentPage - 1)}
                                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                            if (
                                page === 1 ||
                                page === totalPages ||
                                Math.abs(page - currentPage) <= 1
                            ) {
                                return (
                                    <PaginationItem key={page}>
                                        <PaginationLink
                                            isActive={page === currentPage}
                                            onClick={() => goToPage(page)}
                                        >
                                            {page}
                                        </PaginationLink>
                                    </PaginationItem>
                                );
                            }
                            if (
                                (page === 2 && currentPage > 3) ||
                                (page === totalPages - 1 && currentPage < totalPages - 2)
                            ) {
                                return <PaginationEllipsis key={page} />;
                            }
                            return null;
                        })}
                        <PaginationItem>
                            <PaginationNext
                                onClick={() => currentPage < totalPages && goToPage(currentPage + 1)}
                                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            )}
        </div>
    );
}