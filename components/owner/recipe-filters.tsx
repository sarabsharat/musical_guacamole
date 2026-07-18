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
import { Search, X, Filter } from "lucide-react";

interface FilterProps {
    currentStatus?: RecipeStatus;
    currentSearch?: string;
}

export function RecipeFilters({ currentStatus, currentSearch }: FilterProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [search, setSearch] = useState(currentSearch || "");

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
    }, [search]);

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

    const hasActiveFilters = search || !!currentStatus;

    return (
        <Card className="border-border shadow-sm">
            <CardContent className="p-4 md:p-6 space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Filter className="h-5 w-5 text-muted-foreground" />
                        <h3 className="text-base font-medium text-foreground">Filters</h3>
                        {hasActiveFilters && (
                            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-semibold text-primary">
                                {search && currentStatus ? "2" : search || currentStatus ? "1" : "0"}
                            </span>
                        )}
                    </div>
                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClearFilters}
                            className="h-9 gap-1 text-sm text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                            Clear all
                        </Button>
                    )}
                </div>

                {/* Filter controls */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="md:col-span-3 space-y-1.5">
                        <Label htmlFor="search" className="text-sm font-medium text-muted-foreground">
                            Search by name
                        </Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                id="search"
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search recipes..."
                                className="pl-10 h-11 bg-background text-base"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Status */}
                    <div className="space-y-1.5">
                        <Label htmlFor="status-filter" className="text-sm font-medium text-muted-foreground">
                            Status
                        </Label>
                        <Select
                            value={currentStatus || "ALL"}
                            onValueChange={handleStatusChange}
                        >
                            <SelectTrigger id="status-filter" className="h-11 bg-background text-base">
                                <SelectValue placeholder="All statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All statuses</SelectItem>
                                <SelectItem value={RecipeStatus.PENDING}>
                                    <span className="flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                                        Pending
                                    </span>
                                </SelectItem>
                                <SelectItem value={RecipeStatus.APPROVED}>
                                    <span className="flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                        Approved
                                    </span>
                                </SelectItem>
                                <SelectItem value={RecipeStatus.REJECTED}>
                                    <span className="flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                                        Rejected
                                    </span>
                                </SelectItem>
                                <SelectItem value={RecipeStatus.REVOKED}>
                                    <span className="flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full bg-gray-500" />
                                        Revoked
                                    </span>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Active filter chips */}
                {hasActiveFilters && (
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-border/50">
                        {search && (
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                                <span>“{search}”</span>
                                <button
                                    type="button"
                                    onClick={() => setSearch("")}
                                    className="rounded-full hover:bg-primary/20 p-0.5 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                        {currentStatus && (
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                                <span>{currentStatus}</span>
                                <button
                                    type="button"
                                    onClick={() => handleStatusChange("ALL")}
                                    className="rounded-full hover:bg-primary/20 p-0.5 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}