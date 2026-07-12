"use client";

import React from "react";

// Define the exact shape of the data the server is passing down
interface DashboardData {
    totalRecipes: number;
    pendingCount: number;
    approvedCount: number;
    flaggedCount: number;
    recentRecipes: any[]; // You can replace 'any' with your Prisma Recipe type
}

export function DashboardUi({ data }: { data: DashboardData }) {
    return (
        <div className="flex flex-col gap-6 p-6">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard title="Total Recipes" count={data.totalRecipes} color="bg-blue-100 text-blue-800" />
                <StatCard title="Approved" count={data.approvedCount} color="bg-green-100 text-green-800" />
                <StatCard title="Pending" count={data.pendingCount} color="bg-yellow-100 text-yellow-800" />
                <StatCard title="Flagged" count={data.flaggedCount} color="bg-red-100 text-red-800" />
            </div>

            {/* Recent Recipes Table */}
            <div className="bg-white rounded shadow p-6 mt-6">
                <h2 className="text-xl font-bold mb-4 border-b pb-2">Recent Recipes</h2>
                {data.recentRecipes.length === 0 ? (
                    <p className="text-gray-500">No recipes found.</p>
                ) : (
                    <ul className="divide-y">
                        {data.recentRecipes.map((recipe) => (
                            <li key={recipe.id} className="py-3 flex justify-between items-center">
                                <span className="font-medium text-gray-800">{recipe.name || "Unnamed Recipe"}</span>
                                <span className={`px-2 py-1 rounded text-sm font-bold ${
                                    recipe.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                        recipe.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-red-100 text-red-700'
                                }`}>
                                    {recipe.status}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

// A simple reusable sub-component for the stats
function StatCard({ title, count, color }: { title: string, count: number, color: string }) {
    return (
        <div className={`p-6 rounded shadow flex flex-col items-center justify-center ${color}`}>
            <h3 className="text-sm uppercase font-bold tracking-wider opacity-80">{title}</h3>
            <span className="text-4xl font-black mt-2">{count}</span>
        </div>
    );
}