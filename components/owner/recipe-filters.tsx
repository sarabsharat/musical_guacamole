"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RecipeStatus } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Check, ChevronsUpDown, Search, X, Filter, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterProps {
    currentStatus?: RecipeStatus;
    currentSearch?: string;
    currentAllergens?: string[];
    currentCaloriesMin?: number;
    currentCaloriesMax?: number;
    allAllergens?: string[];
}

export function RecipeFilters({
                                  currentStatus,
                                  currentSearch,
                                  currentAllergens = [],
                                  currentCaloriesMin,
                                  currentCaloriesMax,
                                  allAllergens = [],
                              }: FilterProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [search, setSearch] = useState(currentSearch || "");
    const [status, setStatus] = useState<string>(currentStatus || "ALL");
    const [selectedAllergens, setSelectedAllergens] = useState<string[]>(currentAllergens);
    const [calMin, setCalMin] = useState(currentCaloriesMin?.toString() || "");
    const [calMax, setCalMax] = useState(currentCaloriesMax?.toString() || "");
    const [allergenPopoverOpen, setAllergenPopoverOpen] = useState(false);
    const [calPopoverOpen, setCalPopoverOpen] = useState(false);

    const applyFilters = () => {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (status && status !== "ALL") params.set("status", status);
        if (selectedAllergens.length > 0) {
            params.set("allergens", selectedAllergens.join(","));
        }
        if (calMin) params.set("calMin", calMin);
        if (calMax) params.set("calMax", calMax);
        params.set("page", "1");
        router.replace(`/owner/recipes?${params.toString()}`, { scroll: false });
        setCalPopoverOpen(false);
    };

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

    const hasActiveFilters = !!(
        search ||
        (status && status !== "ALL") ||
        selectedAllergens.length > 0 ||
        calMin ||
        calMax
    );

    const handleClearFilters = () => {
        setSearch("");
        setStatus("ALL");
        setSelectedAllergens([]);
        setCalMin("");
        setCalMax("");
        router.replace("/owner/recipes", { scroll: false });
    };

    const toggleAllergen = (allergen: string) => {
        setSelectedAllergens((prev) =>
            prev.includes(allergen)
                ? prev.filter((a) => a !== allergen)
                : [...prev, allergen]
        );
    };

    const handleApplyCalories = () => {
        setCalPopoverOpen(false);
        applyFilters();
    };

    return (
        <TooltipProvider>
            <div className="bg-card border border-border rounded-xl shadow-sm p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                    {/* Search */}
                    <div className="space-y-1">
                        <Label htmlFor="search-filter" className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            Search
                            <Tooltip>
                                <TooltipTrigger>
                                    <span className="cursor-help text-[10px] text-muted-foreground">ⓘ</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="text-xs">Search by meal name</p>
                                </TooltipContent>
                            </Tooltip>
                        </Label>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="search-filter"
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Meal name..."
                                className="pl-8 h-9 bg-background text-sm w-full"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Status */}
                    <div className="space-y-1">
                        <Label htmlFor="status-filter" className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            Status
                            <Tooltip>
                                <TooltipTrigger>
                                    <span className="cursor-help text-[10px] text-muted-foreground">ⓘ</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="text-xs">Filter by recipe status</p>
                                </TooltipContent>
                            </Tooltip>
                        </Label>
                        <Select value={status} onValueChange={(val) => setStatus(val)}>
                            <SelectTrigger id="status-filter" className="h-9 bg-background text-sm w-full">
                                <SelectValue placeholder="All" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All</SelectItem>
                                <SelectItem value={RecipeStatus.PENDING}>
                                    <span className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                                        Pending
                                    </span>
                                </SelectItem>
                                <SelectItem value={RecipeStatus.APPROVED}>
                                    <span className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                        Approved
                                    </span>
                                </SelectItem>
                                <SelectItem value={RecipeStatus.REJECTED}>
                                    <span className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                                        Rejected
                                    </span>
                                </SelectItem>
                                <SelectItem value={RecipeStatus.REVOKED}>
                                    <span className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-gray-500" />
                                        Revoked
                                    </span>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Allergens */}
                    <div className="space-y-1">
                        <Label htmlFor="allergen-filter" className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            Allergens
                            <Tooltip>
                                <TooltipTrigger>
                                    <span className="cursor-help text-[10px] text-muted-foreground">ⓘ</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="text-xs">Filter by allergens present</p>
                                </TooltipContent>
                            </Tooltip>
                        </Label>
                        <Popover open={allergenPopoverOpen} onOpenChange={setAllergenPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={allergenPopoverOpen}
                                    className="h-9 w-full justify-between bg-background text-sm font-normal px-3"
                                >
                                    <span className="truncate">
                                        {selectedAllergens.length === 0
                                            ? "Select..."
                                            : `${selectedAllergens.length} selected`}
                                    </span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[200px] p-0">
                                <Command>
                                    <CommandInput placeholder="Search allergens..." />
                                    <CommandEmpty>No allergen found.</CommandEmpty>
                                    <CommandGroup className="max-h-48 overflow-auto">
                                        {allAllergens.map((allergen) => (
                                            <CommandItem
                                                key={allergen}
                                                value={allergen}
                                                onSelect={() => toggleAllergen(allergen)}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        selectedAllergens.includes(allergen)
                                                            ? "opacity-100"
                                                            : "opacity-0"
                                                    )}
                                                />
                                                {allergen}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Calories */}
                    <div className="space-y-1">
                        <Label htmlFor="calorie-filter" className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            Calories
                            <Tooltip>
                                <TooltipTrigger>
                                    <span className="cursor-help text-[10px] text-muted-foreground">ⓘ</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="text-xs">Set min and max calories</p>
                                </TooltipContent>
                            </Tooltip>
                        </Label>
                        <Popover open={calPopoverOpen} onOpenChange={setCalPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="h-9 w-full justify-between bg-background text-sm font-normal px-3"
                                >
                                    <span className="flex items-center gap-1">
                                        <Flame className="h-4 w-4 text-muted-foreground" />
                                        <span className="truncate">
                                            {calMin || calMax
                                                ? `${calMin || "0"} – ${calMax || "∞"} kcal`
                                                : "Range"}
                                        </span>
                                    </span>
                                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[280px] p-4" align="start">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 space-y-1">
                                            <Label htmlFor="cal-min" className="text-xs font-medium text-muted-foreground">
                                                Min
                                            </Label>
                                            <Input
                                                id="cal-min"
                                                type="number"
                                                value={calMin}
                                                onChange={(e) => setCalMin(e.target.value)}
                                                placeholder="0"
                                                className="h-9 bg-background text-sm"
                                            />
                                        </div>
                                        <span className="text-muted-foreground text-sm pt-4">–</span>
                                        <div className="flex-1 space-y-1">
                                            <Label htmlFor="cal-max" className="text-xs font-medium text-muted-foreground">
                                                Max
                                            </Label>
                                            <Input
                                                id="cal-max"
                                                type="number"
                                                value={calMax}
                                                onChange={(e) => setCalMax(e.target.value)}
                                                placeholder="∞"
                                                className="h-9 bg-background text-sm"
                                            />
                                        </div>
                                        <span className="text-xs text-muted-foreground pt-4">kcal</span>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setCalMin("");
                                                setCalMax("");
                                                setCalPopoverOpen(false);
                                                applyFilters();
                                            }}
                                            className="h-8 text-xs"
                                        >
                                            Clear
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={handleApplyCalories}
                                            className="h-8 text-xs gap-1"
                                        >
                                            <Filter className="h-3 w-3" />
                                            Apply
                                        </Button>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Actions */}
                    <div className="space-y-1 flex items-end gap-2">
                        <Button
                            onClick={applyFilters}
                            size="sm"
                            className="h-9 flex-1 gap-1 text-sm"
                        >
                            <Filter className="h-4 w-4" />
                            Apply
                        </Button>
                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleClearFilters}
                                className="h-9 px-2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                                <span className="sr-only">Clear</span>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Chips */}
                {hasActiveFilters && (
                    <div className="flex flex-wrap gap-2 pt-0.5 border-t border-border/50">
                        {search && (
                            <Badge variant="secondary" className="gap-1 px-2.5 py-1 text-xs font-normal">
                                “{search}”
                                <button
                                    type="button"
                                    onClick={() => setSearch("")}
                                    className="ml-1 hover:text-foreground"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        )}
                        {status && status !== "ALL" && (
                            <Badge variant="secondary" className="gap-1 px-2.5 py-1 text-xs font-normal">
                                {status}
                                <button
                                    type="button"
                                    onClick={() => setStatus("ALL")}
                                    className="ml-1 hover:text-foreground"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        )}
                        {selectedAllergens.length > 0 && (
                            <Badge variant="secondary" className="gap-1 px-2.5 py-1 text-xs font-normal">
                                {selectedAllergens.length} allergen{selectedAllergens.length > 1 ? "s" : ""}
                                <button
                                    type="button"
                                    onClick={() => setSelectedAllergens([])}
                                    className="ml-1 hover:text-foreground"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        )}
                        {(calMin || calMax) && (
                            <Badge variant="secondary" className="gap-1 px-2.5 py-1 text-xs font-normal">
                                {calMin || "0"} – {calMax || "∞"} kcal
                                <button
                                    type="button"
                                    onClick={() => { setCalMin(""); setCalMax(""); applyFilters(); }}
                                    className="ml-1 hover:text-foreground"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        )}
                    </div>
                )}
            </div>
        </TooltipProvider>
    );
}