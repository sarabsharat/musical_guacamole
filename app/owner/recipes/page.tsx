import React from "react";
import { redirect } from "next/navigation";
import { getOwnerRecipes } from "@/actions/owner-recipes";
import { RecipeFilters } from "@/components/owner/recipe-filters";
import { StatusBadge } from "@/components/shared/status-badge";
import { assertUserAccess } from "@/lib/security";
import { Role, RecipeStatus } from "@prisma/client";
import { getSession } from "@/lib/auth"; // Your new secure utility
import Link from "next/link";

interface PageProps {
    searchParams: Promise<{
        status?: string;
        search?: string;
        page?: string;
    }>;
}

export default async function RecipesPage({ searchParams }: PageProps) {
    // 1. Get the authenticated session
    const currentUser = await getSession();

    if (!currentUser) {
        redirect("/auth/login");
    }

    // 2. 🚨 PAGE-LEVEL GUARDRAIL 🚨
    // Ensures this user is an owner and matches the requested restaurant
    await assertUserAccess(currentUser, [Role.restaurant_owner], currentUser.restaurantId);

    // 3. Await searchParams in modern Next.js App Router
    const params = await searchParams;
    const currentStatus = params.status as RecipeStatus | undefined;
    const searchQuery = params.search || "";
    const currentPage = Number(params.page) || 1;

    // 4. Retrieve isolated data
    // Note: We no longer pass tenantId here; the action uses the trusted currentUser session!
    const response = await getOwnerRecipes(currentUser, {
        status: currentStatus,
        search: searchQuery,
        page: currentPage,
        limit: 10,
    });

    if (!response.success || !response.data) {
        return (
            <div className="min-h-screen bg-neutral-100 p-8 text-black">
                <div className="border-4 border-red-600 bg-red-50 p-6 rounded-none">
                    <h2 className="font-mono text-xl font-bold uppercase text-red-600">Retrieval Fault</h2>
                    <p className="mt-2 font-mono text-xs text-red-700">{response.message}</p>
                </div>
            </div>
        );
    }

    const { recipes, totalCount, totalPages } = response.data;

    return (
        <div className="min-h-screen bg-neutral-100 p-8 text-black">
            <div className="mx-auto max-w-5xl border-4 border-black bg-white p-6 rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b-4 border-black pb-4 gap-4">
                    <div>
                        <h1 className="font-mono text-3xl font-extrabold uppercase tracking-tight">
                            Menu Portfolio
                        </h1>
                        <p className="font-mono text-xs text-neutral-600 mt-1">
                            Publish, trace, and audit registered restaurant menu options and nutrition metrics.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href="/owner/submit"
                            className="bg-black text-white px-4 py-2 font-mono text-xs font-bold uppercase border-2 border-black rounded-none hover:bg-neutral-800 transition text-center"
                        >
                            + Ingest Recipe Notes
                        </Link>
                        <Link
                            href="/owner/drafts"
                            className="bg-white text-black px-4 py-2 font-mono text-xs font-bold uppercase border-2 border-black rounded-none hover:bg-neutral-50 transition text-center"
                        >
                            Check Draft Queue
                        </Link>
                    </div>
                </div>

                {/* Filters and Search Bar Component */}
                <RecipeFilters currentStatus={currentStatus} currentSearch={searchQuery} />

                {/* Brutalist Custom Table Layout */}
                <div className="border-4 border-black overflow-x-auto bg-white rounded-none">
                    <table className="w-full font-mono text-xs text-left border-collapse">
                        <thead>
                        <tr className="bg-black text-white border-b-4 border-black">
                            <th className="p-3 font-bold uppercase">Meal Name</th>
                            <th className="p-3 font-bold uppercase">Calories</th>
                            <th className="p-3 font-bold uppercase">Macros (P / C / F)</th>
                            <th className="p-3 font-bold uppercase">Allergens Identified</th>
                            <th className="p-3 font-bold uppercase">Status</th>
                            <th className="p-3 font-bold uppercase text-right">Audit Logs</th>
                        </tr>
                        </thead>
                        <tbody>
                        {recipes.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-neutral-500 italic">
                                    No recipes have been registered matching the search query parameters.
                                </td>
                            </tr>
                        ) : (
                            recipes.map((recipe: any) => (
                                <tr key={recipe.id} className="border-b-2 border-black hover:bg-neutral-50">
                                    <td className="p-3 font-bold">{recipe.meal_name}</td>
                                    <td className="p-3 font-semibold">{recipe.calories} kcal</td>
                                    <td className="p-3">
                                        {recipe.protein}g / {recipe.carbs}g / {recipe.total_fat}g
                                    </td>
                                    <td className="p-3">
                                        <div className="flex flex-wrap gap-1">
                                            {recipe.detected_allergens?.length === 0 ? (
                                                <span className="text-neutral-400 italic text-[10px]">None</span>
                                            ) : (
                                                recipe.detected_allergens?.map((all: string) => (
                                                    <span
                                                        key={all}
                                                        className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 border border-red-300 font-bold uppercase rounded-none"
                                                    >
                              {all}
                            </span>
                                                ))
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <StatusBadge status={recipe.status} />
                                    </td>
                                    <td className="p-3 text-right">
                                        <Link
                                            href={`/owner/recipes/${recipe.id}`}
                                            className="bg-white hover:bg-black hover:text-white px-2 py-1 font-bold border border-black rounded-none text-[10px] uppercase transition"
                                        >
                                            Inspect
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>

                {/* Simple Brutalist Pagination Control */}
                <div className="flex justify-between items-center font-mono text-xs pt-4 border-t-2 border-black">
          <span className="font-semibold text-neutral-600">
            Page {currentPage} of {totalPages || 1} ({totalCount} entries)
          </span>
                    <div className="flex space-x-2">
                        <Link
                            href={`/owner/recipes?page=${currentPage - 1}${currentStatus ? `&status=${currentStatus}` : ""}${searchQuery ? `&search=${searchQuery}` : ""}`}
                            className={`border-2 border-black px-3 py-1 font-bold uppercase rounded-none bg-white transition hover:bg-black hover:text-white ${
                                currentPage <= 1 ? "pointer-events-none opacity-30" : ""
                            }`}
                        >
                            Prev
                        </Link>
                        <Link
                            href={`/owner/recipes?page=${currentPage + 1}${currentStatus ? `&status=${currentStatus}` : ""}${searchQuery ? `&search=${searchQuery}` : ""}`}
                            className={`border-2 border-black px-3 py-1 font-bold uppercase rounded-none bg-white transition hover:bg-black hover:text-white ${
                                currentPage >= totalPages ? "pointer-events-none opacity-30" : ""
                            }`}
                        >
                            Next
                        </Link>
                    </div>
                </div>

            </div>
        </div>
    );
}