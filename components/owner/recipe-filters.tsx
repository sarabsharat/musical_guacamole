// src/components/owner/recipe-filters.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RecipeStatus } from "@prisma/client";

// Shadcn UI
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

interface FilterProps {
    currentStatus?: RecipeStatus;
    currentSearch?: string;
}

export function RecipeFilters({ currentStatus, currentSearch }: FilterProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [search, setSearch] = useState(currentSearch || "");

    // Debounce input text updates to avoid excessive database queries
    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (search) {
                params.set("search", search);
            } else {
                params.delete("search");
            }
            params.set("page", "1"); // Reset index on filter changes
            router.push(`/owner/recipes?${params.toString()}`);
        }, 400);

        return () => clearTimeout(delayDebounce);
    }, [search, searchParams, router]);

    const handleStatusChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        // Map "ALL" back to an empty string to remove the filter
        if (value && value !== "ALL") {
            params.set("status", value);
        } else {
            params.delete("status");
        }
        params.set("page", "1");
        router.push(`/owner/recipes?${params.toString()}`);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-5 rounded-lg border bg-card text-card-foreground shadow-sm">
            {/* Name searching */}
            <div className="md:col-span-3 space-y-2">
                <Label htmlFor="search" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Search portfolio meal name
                </Label>
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="search"
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="e.g. Kmaj, Amman, Mansaf..."
                        className="pl-9 bg-background"
                    />
                </div>
            </div>

            {/* Status Filter Dropdown */}
            <div className="space-y-2">
                <Label htmlFor="status-filter" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Compliance Status
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
                        <SelectItem value={RecipeStatus.PENDING}>Pending Audit</SelectItem>
                        <SelectItem value={RecipeStatus.APPROVED}>Approved / Active</SelectItem>
                        <SelectItem value={RecipeStatus.REJECTED}>Rejected / Action Req</SelectItem>
                        <SelectItem value={RecipeStatus.REVOKED}>Revoked by JFDA</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}