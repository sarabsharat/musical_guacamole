import { RequireAdminAuth } from "@/lib/RequireAdminAuth";
import prisma from "@/lib/prisma";

export default async function AdminDashboardPage() {

    await RequireAdminAuth();

    const [totalUsers, totalRestaurants, totalRecipes] = await Promise.all([
        prisma.user.count(),
        prisma.restaurant.count(),
        prisma.recipe.count(),
    ]);

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <h1 className="text-3xl font-extrabold uppercase mb-8 border-b-4 border-black pb-4 text-black">
                Global Overview
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <div className="text-sm font-bold uppercase text-neutral-500">Total Users</div>
                    <div className="text-4xl font-black text-black">{totalUsers}</div>
                </div>
                <div className="border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <div className="text-sm font-bold uppercase text-neutral-500">Total Tenants</div>
                    <div className="text-4xl font-black text-black">{totalRestaurants}</div>
                </div>
                <div className="border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <div className="text-sm font-bold uppercase text-neutral-500">Global Recipes</div>
                    <div className="text-4xl font-black text-black">{totalRecipes}</div>
                </div>
            </div>
        </div>
    );
}