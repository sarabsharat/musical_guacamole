// src/app/owner/dashboard/page.tsx
import { getSession, assertUserAccess } from "@/lib/security";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { serializePrisma } from "@/lib/serialize";

export default async function DashboardPage() {
    const currentUser = await getSession();
    await assertUserAccess(currentUser, [Role.restaurant_owner], currentUser?.restaurantId);

    if (!currentUser?.restaurantId) {
        return <div>No restaurant found.</div>;
    }

    // Resolve dynamic header list
    const headerList = await headers();
    const injectedTenantSlug = headerList.get("x-tenant-slug");

    if (currentUser.role === Role.restaurant_owner) {
        if (injectedTenantSlug && currentUser.slug !== injectedTenantSlug) {
            notFound();
        }
    }

    const restaurantId = currentUser.restaurantId;

    const [
        totalRecipes,
        pendingCount,
        approvedCount,
        rejectedCount,
        revokedCount,
        recentRecipes,
    ] = await Promise.all([
        prisma.recipe.count({ where: { restaurant_id: restaurantId } }),
        prisma.recipe.count({ where: { restaurant_id: restaurantId, status: "PENDING" } }),
        prisma.recipe.count({ where: { restaurant_id: restaurantId, status: "APPROVED" } }),
        prisma.recipe.count({ where: { restaurant_id: restaurantId, status: "REJECTED" } }),
        prisma.recipe.count({ where: { restaurant_id: restaurantId, status: "REVOKED" } }),
        prisma.recipe.findMany({
            where: { restaurant_id: restaurantId },
            orderBy: { id: "desc" },
            take: 5,
        }),
    ]);

    const serializedRecent = serializePrisma(recentRecipes);

    return (
        <div className="space-y-6">
            <div className="border-b-4 border-black pb-4">
                <h1 className="font-mono text-3xl font-extrabold uppercase tracking-tight">Dashboard</h1>
                <p className="font-mono text-xs text-neutral-600 mt-1">
                    Overview of your restaurant's compliance status and recipe portfolio.
                </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="border-4 border-black p-4 bg-white rounded-none">
                    <div className="text-[10px] font-mono uppercase text-neutral-400">Total Recipes</div>
                    <div className="text-2xl font-extrabold">{totalRecipes}</div>
                </div>
                <div className="border-4 border-black p-4 bg-white rounded-none">
                    <div className="text-[10px] font-mono uppercase text-neutral-400">Pending Reviews</div>
                    <div className="text-2xl font-extrabold">{pendingCount}</div>
                </div>
                <div className="border-4 border-black p-4 bg-white rounded-none">
                    <div className="text-[10px] font-mono uppercase text-neutral-400">Approved</div>
                    <div className="text-2xl font-extrabold text-green-600">{approvedCount}</div>
                </div>
                <div className="border-4 border-black p-4 bg-white rounded-none">
                    <div className="text-[10px] font-mono uppercase text-neutral-400">Issues Flagged</div>
                    <div className="text-2xl font-extrabold text-red-600">{rejectedCount + revokedCount}</div>
                </div>
            </div>

            <div className="border-4 border-black p-4 bg-white rounded-none">
                <div className="flex justify-between items-center border-b-2 border-black pb-2">
                    <h2 className="font-mono text-sm font-bold uppercase">Recent Recipes</h2>
                    <Link href="/recipes" className="text-xs font-bold uppercase border border-black px-2 py-1 hover:bg-black hover:text-white transition">View All</Link>
                </div>
                {serializedRecent.length === 0 ? (
                    <p className="text-xs text-neutral-500 py-4">No recipes yet. <Link href="/submit" className="underline">Add your first recipe</Link></p>
                ) : (
                    <ul className="divide-y-2 divide-black">
                        {serializedRecent.map((recipe: any) => (
                            <li key={recipe.id} className="py-3 flex justify-between items-center">
                                <div>
                                    <div className="font-bold text-sm">{recipe.meal_name}</div>
                                    <div className="text-xs text-neutral-500">{recipe.calories} kcal • {recipe.protein}g P • {recipe.carbs}g C • {recipe.total_fat}g F</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <StatusBadge status={recipe.status} />
                                    <Link href={`/recipes/${recipe.id}`} className="border border-black px-2 py-1 text-[10px] font-bold uppercase hover:bg-black hover:text-white transition">View</Link>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="flex gap-4">
                <Link href="/submit" className="bg-black text-white px-4 py-2 font-mono text-xs font-bold uppercase border-2 border-black rounded-none hover:bg-neutral-800 transition">
                    + Ingest Recipe
                </Link>
                <Link href="/drafts" className="bg-white text-black px-4 py-2 font-mono text-xs font-bold uppercase border-2 border-black rounded-none hover:bg-neutral-50 transition">
                    View Drafts
                </Link>
            </div>
        </div>
    );
}