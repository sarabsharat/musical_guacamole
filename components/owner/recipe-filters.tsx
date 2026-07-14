// components/owner/recipe-filters.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RecipeStatus } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface FilterProps {
    currentStatus?: RecipeStatus;
    currentSearch?: string;
}

export function RecipeFilters({ currentStatus, currentSearch }: FilterProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [search, setSearch] = useState(currentSearch || "");

    // Debounce search input
    useEffect(() => {
        if (search === (currentSearch || "")) return;

        const delayDebounce = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (search) {
                params.set("search", search);
            } else {
                params.delete("search");
            }
            params.set("page", "1");
            router.replace(`/owner/recipes?${params.toString()}`, { scroll: false });
        }, 400);

        return () => clearTimeout(delayDebounce);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    // ✅ FIX 1: Allow value to be string | null to satisfy the Shadcn Select type signature
    const handleStatusChange = (value: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value && value !== "ALL") {
            params.set("status", value);
        } else {
            params.delete("status");
        }
        params.set("page", "1");
        router.replace(`/owner/recipes?${params.toString()}`, { scroll: false });
    };

    const handleClearFilters = () => {
        setSearch("");
        router.replace("/owner/recipes", { scroll: false });
    };

    // ✅ FIX 2: currentStatus is strongly typed to RecipeStatus, so it will never equal "ALL".
    // We can just check if it is truthy.
    const hasActiveFilters = search || !!currentStatus;

    return (
        <Card>
            <CardContent className="pt-6">
                <div className="space-y-4">
                    {/* Search & Filter Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-semibold">Filter Recipes</h3>
                            <p className="text-xs text-muted-foreground">
                                {hasActiveFilters ? "Active filters applied" : "Search and filter your recipes"}
                            </p>
                        </div>
                        {hasActiveFilters && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleClearFilters}
                                className="gap-1 text-xs"
                            >
                                <X className="h-3 w-3" />
                                Clear Filters
                            </Button>
                        )}
                    </div>

                    {/* Filter Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Search Input */}
                        <div className="md:col-span-3 space-y-2">
                            <Label htmlFor="search" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Search by Name
                            </Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="search"
                                    type="search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="e.g. Shawarma, Falafel, Tabbouleh..."
                                    className="pl-9 bg-background"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => setSearch("")}
                                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Status Filter */}
                        <div className="space-y-2">
                            <Label htmlFor="status-filter" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Status
                            </Label>
                            <Select
                                value={currentStatus || "ALL"}
                                onValueChange={handleStatusChange}
                            >
                                <SelectTrigger id="status-filter" className="bg-background">
                                    <SelectValue placeholder="All Recipes" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Recipes</SelectItem>
                                    <SelectItem value={RecipeStatus.PENDING}>
                                        <span className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                                            Pending Audit
                                        </span>
                                    </SelectItem>
                                    <SelectItem value={RecipeStatus.APPROVED}>
                                        <span className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-green-500" />
                                            Approved
                                        </span>
                                    </SelectItem>
                                    <SelectItem value={RecipeStatus.REJECTED}>
                                        <span className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-red-500" />
                                            Rejected
                                        </span>
                                    </SelectItem>
                                    <SelectItem value={RecipeStatus.REVOKED}>
                                        <span className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-red-600" />
                                            Revoked
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Active Filters Display */}
                    {hasActiveFilters && (
                        <div className="flex flex-wrap gap-2 pt-2">
                            {search && (
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs">
                                    <span>Search: {search}</span>
                                    <button
                                        type="button"
                                        onClick={() => setSearch("")}
                                        className="hover:opacity-70 transition-opacity"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            )}
                            {/* ✅ FIX 3: Removed currentStatus !== "ALL" since currentStatus can only be a valid RecipeStatus or undefined */}
                            {currentStatus && (
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs">
                                    <span>Status: {currentStatus}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleStatusChange("ALL")}
                                        className="hover:opacity-70 transition-opacity"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}