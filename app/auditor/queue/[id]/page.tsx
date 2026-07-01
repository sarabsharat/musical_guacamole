// app/auditor/queue/[id]/page.tsx
import React from "react";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serializePrisma } from "@/lib/serialize";
import { getSession, assertUserAccess } from "@/lib/security";
import { Role } from "@prisma/client";
import { verifyRecipeLevel1 } from "@/actions/auditor";
import Link from "next/link";

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function AuditRecipeDetailPage({ params }: PageProps) {
    // 1. Authenticate user context
    const session = await getSession();

    // 2. 🚨 SECURITY: Role compliance check
    await assertUserAccess(session, [Role.nutritionist_auditor, Role.platform_admin]);

    // 3. Resolve dynamic parameters
    const { id } = await params;
    const recipeId = parseInt(id, 10);

    if (isNaN(recipeId)) {
        return notFound();
    }

    // 4. Fetch the target recipe details
    const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
        include: {
            restaurant: {
                select: {
                    business_name: true,
                    address_line: true,
                },
            },
            ingredients: {
                include: {
                    ingredient_item: true,
                },
            },
        },
    });

    if (!recipe) {
        return notFound();
    }

    const serializedRecipe = serializePrisma(recipe);

    // 5. Server Action wrapper inside Form Action to execute validation directly (React 19 / Next.js 15+ standard) [3]
    async function handleAuditFormSubmit(formData: FormData) {
        "use server";

        const decision = formData.get("decision")?.toString();
        const reason = formData.get("reason")?.toString() || "";

        if (!decision) return;

        const approved = decision === "approve";

        const res = await verifyRecipeLevel1(recipeId, approved, reason);

        if (res.success) {
            redirect("/auditor/queue");
        }
    }

    return (
        <div className="min-h-screen bg-neutral-100 p-8 text-black">
            <div className="mx-auto max-w-5xl border-4 border-black bg-white p-6 rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6">

                {/* Navigation Breadcrumbs */}
                <div className="font-mono text-xs uppercase flex space-x-2 border-b-2 border-black pb-2">
                    <Link href="/auditor/queue" className="underline hover:text-red-500">Verification Queue</Link>
                    <span>/</span>
                    <span className="text-neutral-500">Recipe Assessment #{serializedRecipe.id}</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* Left Column: Media Reference, Proportions, and Calculations */}
                    <div className="lg:col-span-7 space-y-6">

                        <div className="border-4 border-black p-4 bg-neutral-50 rounded-none space-y-4">
                            <h2 className="font-mono text-lg font-extrabold uppercase border-b-2 border-black pb-2">
                                Digital Math Integrity Check
                            </h2>
                            <div className="bg-black text-white p-4 font-mono grid grid-cols-2 gap-4 text-center rounded-none">
                                <div className="bg-neutral-900 border border-neutral-700 p-2">
                                    <div className="text-[9px] uppercase text-neutral-400">Calculated Yield</div>
                                    <div className="text-lg font-bold">{serializedRecipe.calories} kcal</div>
                                </div>
                                <div className="bg-neutral-900 border border-neutral-700 p-2">
                                    <div className="text-[9px] uppercase text-neutral-400">Protein</div>
                                    <div className="text-lg font-bold">{serializedRecipe.protein}g</div>
                                </div>
                                <div className="bg-neutral-900 border border-neutral-700 p-2">
                                    <div className="text-[9px] uppercase text-neutral-400">Carbs</div>
                                    <div className="text-lg font-bold">{serializedRecipe.carbs}g</div>
                                </div>
                                <div className="bg-neutral-900 border border-neutral-700 p-2">
                                    <div className="text-[9px] uppercase text-neutral-400">Total Fat</div>
                                    <div className="text-lg font-bold">{serializedRecipe.total_fat}g</div>
                                </div>
                            </div>
                        </div>

                        {/* Individual Ingredient Multipliers List */}
                        <div className="border-4 border-black p-4 bg-white rounded-none space-y-3">
                            <h3 className="font-mono text-sm font-bold uppercase border-b-2 border-black pb-1">
                                Parsed Proportions List
                            </h3>
                            <div className="space-y-2">
                                {serializedRecipe.ingredients.map((ing: any) => (
                                    <div key={ing.id} className="border-2 border-black p-3 font-mono text-xs flex justify-between items-center rounded-none bg-neutral-50">
                                        <div>
                                            <div className="font-bold uppercase">{ing.ingredient_item.name}</div>
                                            <div className="text-[10px] text-neutral-500 mt-1">Stated: &ldquo;{ing.user_stated_amount}&rdquo;</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-extrabold">{ing.normalized_grams}g</div>
                                            <div className="text-[9px] text-neutral-400 mt-1">
                                                ({(ing.ingredient_item.calories_per_g * ing.normalized_grams).toFixed(1)} kcal)
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Visual deviant checklist & Action Resolution Panel */}
                    <div className="lg:col-span-5 space-y-6">

                        {serializedRecipe.image_url && (
                            <div className="border-4 border-black p-2 bg-neutral-50 rounded-none">
                                <h4 className="font-mono text-xs font-bold uppercase mb-2">Ingested Photo Comparison</h4>
                                <div className="w-full h-48 border-2 border-black overflow-hidden relative">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={serializedRecipe.image_url}
                                        alt={serializedRecipe.meal_name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Verification Form */}
                        <div className="border-4 border-black p-4 bg-white rounded-none">
                            <h3 className="font-mono text-sm font-bold uppercase border-b-2 border-black pb-2 mb-4">
                                Nutritionist Assessment Sign-Off
                            </h3>

                            <form action={handleAuditFormSubmit} className="space-y-4 font-mono">

                                {/* Decision input radio boxes */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3 border-2 border-black p-3 bg-green-50 rounded-none cursor-pointer">
                                        <input
                                            required
                                            type="radio"
                                            id="approve"
                                            name="decision"
                                            value="approve"
                                            className="accent-black w-4 h-4"
                                        />
                                        <label htmlFor="approve" className="text-xs font-bold uppercase cursor-pointer">
                                            Approve & Register Level 1
                                        </label>
                                    </div>

                                    <div className="flex items-center gap-3 border-2 border-black p-3 bg-red-50 rounded-none cursor-pointer">
                                        <input
                                            required
                                            type="radio"
                                            id="reject"
                                            name="decision"
                                            value="reject"
                                            className="accent-black w-4 h-4"
                                        />
                                        <label htmlFor="reject" className="text-xs font-bold uppercase cursor-pointer">
                                            Reject Recipe (Action Req.)
                                        </label>
                                    </div>
                                </div>

                                {/* Feedback reason textarea */}
                                <div className="space-y-1">
                                    <label htmlFor="reason" className="block text-[10px] font-bold uppercase text-neutral-500">
                                        Rejection notes / Audit comments
                                    </label>
                                    <textarea
                                        id="reason"
                                        name="reason"
                                        rows={4}
                                        placeholder="Specify target reasons for rejections (e.g. Ingested bread weight doesn't coordinate with average Kmaj proportions, sugar yield limits exceeded, etc.)."
                                        className="w-full border-2 border-black p-2 text-xs rounded-none focus:outline-none"
                                    />
                                </div>

                                {/* Trigger compliance execution */}
                                <button
                                    type="submit"
                                    className="w-full bg-black hover:bg-neutral-800 text-white py-3 font-bold text-xs uppercase border-2 border-black rounded-none transition"
                                >
                                    Publish Compliance Decision
                                </button>

                            </form>
                        </div>

                    </div>

                </div>

            </div>
        </div>
    );
}