"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RecipeStatus } from "@prisma/client";

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

    const handleStatusChange = (status: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (status) {
            params.set("status", status);
        } else {
            params.delete("status");
        }
        params.set("page", "1");
        router.push(`/owner/recipes?${params.toString()}`);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border-4 border-black bg-neutral-50 rounded-none">

            {/* Name searching */}
            <div className="md:col-span-3 space-y-1">
                <label className="block font-mono text-[10px] font-bold uppercase text-neutral-600">
                    Search portfolio meal name
                </label>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="e.g. Kmaj, Amman, Mansaf..."
                    className="w-full border-2 border-black p-2 font-mono text-xs rounded-none bg-white focus:outline-none focus:bg-neutral-100"
                />
            </div>

            {/* Status Filter Dropdown */}
            <div className="space-y-1">
                <label className="block font-mono text-[10px] font-bold uppercase text-neutral-600">
                    Compliance Status
                </label>
                <select
                    value={currentStatus || ""}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-full border-2 border-black p-2 font-mono text-xs rounded-none bg-white focus:outline-none"
                >
                    <option value="">ALL RECIPES</option>
                    <option value={RecipeStatus.PENDING}>PENDING AUDIT</option>
                    <option value={RecipeStatus.APPROVED}>APPROVED / ACTIVE</option>
                    <option value={RecipeStatus.REJECTED}>REJECTED / ACTION REQ</option>
                    <option value={RecipeStatus.REVOKED}>REVOKED BY JFDA</option>
                </select>
            </div>

        </div>
    );
}