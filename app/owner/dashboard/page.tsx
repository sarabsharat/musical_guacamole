// src/app/owner/dashboard/page.tsx
import { getSession, assertUserAccess } from "@/lib/security";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { serializePrisma } from "@/lib/serialize";
import {getTenantContext} from "@/lib/tenant";
import {requireOwnerAuth} from "@/lib/RequireOwnerAuth";

export default async function DashboardPage() {
    const { restaurantId } = await requireOwnerAuth();
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
        <div >
            <div >
                <h1 >Dashboard</h1>
                <p >
                    Overview of your restaurant's compliance status and recipe portfolio.
                </p>
            </div>

            <div>
                <div >
                    <div>Total Recipes</div>
                    <div >{totalRecipes}</div>
                </div>
                <div >
                    <div >Pending Reviews</div>
                    <div >{pendingCount}</div>
                </div>
                <div >
                    <div>Approved</div>
                    <div>{approvedCount}</div>
                </div>
                <div >
                    <div >Issues Flagged</div>
                    <div>{rejectedCount + revokedCount}</div>
                </div>
            </div>

            <div>
                <div>
                    <h2 >Recent Recipes</h2>
                    <Link href="/recipes" >View All</Link>
                </div>
                {serializedRecent.length === 0 ? (
                    <p >No recipes yet. <Link href="/submit" className="underline">Add your first recipe</Link></p>
                ) : (
                    <ul >
                        {serializedRecent.map((recipe: any) => (
                            <li key={recipe.id} >
                                <div>
                                    <div>{recipe.meal_name}</div>
                                    <div >{recipe.calories} kcal • {recipe.protein}g P • {recipe.carbs}g C • {recipe.total_fat}g F</div>
                                </div>
                                <div>
                                    <StatusBadge status={recipe.status} />
                                    <Link href={`/recipes/${recipe.id}`}>View</Link>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div >
                <Link href="/submit" >
                    + Ingest Recipe
                </Link>
                <Link href="/drafts" >
                    View Drafts
                </Link>
            </div>
        </div>
    );
}