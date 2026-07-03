// src/app/auditor/audit/[restaurantId]/page.tsx.tsx
import React from "react";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serializePrisma } from "@/lib/serialize";
import { getSession, assertUserAccess } from "@/lib/security";
import { submitPhysicalSiteAudit } from "@/actions/auditor";
import { Role } from "@prisma/client";
import Link from "next/link";

interface PageProps {
    params: Promise<{
        restaurantId: string;
    }>;
}

export default async function PhysicalAuditPage({ params }: PageProps) {
    // 1. Authenticate user context
    const session = await getSession();
    await assertUserAccess(session, [Role.nutritionist_auditor, Role.platform_admin]);

    // 2. Resolve dynamic parameters
    const { restaurantId } = await params;
    const parsedId = parseInt(restaurantId, 10);

    if (isNaN(parsedId)) {
        return notFound();
    }

    // 3. Fetch restaurant details along with existing profile
    const restaurant = await prisma.restaurant.findUnique({
        where: { id: parsedId },
        include: {
            profile: true,
            recipes: {
                select: { id: true, meal_name: true, status: true },
            },
        },
    });

    if (!restaurant) {
        return notFound();
    }

    const serializedRestaurant = serializePrisma(restaurant);
    const activeProfile = serializedRestaurant.profile?.[0] || null;

    // 4. Form Submission Form Action (React 19 Server-Side handler) [3]
    async function handleAuditSubmit(formData: FormData) {
        "use server";
        const hasDedicatedAllergenZones = formData.get("allergenZones") === "true";
        const usesStandardizedRecipes = formData.get("standardRecipes") === "true";

        const res = await submitPhysicalSiteAudit({
            restaurantId: parsedId,
            hasDedicatedAllergenZones,
            usesStandardizedRecipes,
        });

        if (res.success) {
            redirect("/auditor/queue");
        }
    }

    return (
        <div className="min-h-screen bg-neutral-100 p-8 text-black font-mono">
            <div className="mx-auto max-w-3xl border-4 border-black bg-white p-6 rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6">

                {/* Navigation Breadcrumbs */}
                <div className="font-mono text-xs uppercase flex space-x-2 border-b-2 border-black pb-2">
                    <Link href="/auditor/queue" className="underline hover:text-red-500">Queue</Link>
                    <span>/</span>
                    <span className="text-neutral-500">Site Audit: {serializedRestaurant.business_name}</span>
                </div>

                <div>
          <span className="bg-red-500 text-white px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-none border border-black">
            L2 Physical Verification
          </span>
                    <h1 className="text-2xl font-extrabold uppercase mt-2">
                        On-Site Kitchen Audit Log
                    </h1>
                    <p className="text-xs text-neutral-600 mt-1">
                        Conduct a physical inspection of cooking processes, allergen separation, and standard weights for: <strong>{serializedRestaurant.business_name}</strong>.
                    </p>
                </div>

                <form action={handleAuditSubmit} className="space-y-6">

                    {/* Question 1: Allergen Zones */}
                    <div className="border-4 border-black p-4 bg-neutral-50 rounded-none space-y-3">
                        <h3 className="text-sm font-bold uppercase">
                            1. Dedicated Allergen-Safe Zones
                        </h3>
                        <p className="text-[11px] text-neutral-500 leading-tight">
                            Does the kitchen maintain physically separated workspaces, cutting boards, and utensils to prevent sesame/gluten cross-contamination?
                        </p>
                        <div className="flex gap-4 pt-2">
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold uppercase">
                                <input
                                    required
                                    type="radio"
                                    name="allergenZones"
                                    value="true"
                                    defaultChecked={activeProfile?.hasDedicatedAllergenZones === true}
                                    className="w-4 h-4 accent-black"
                                />
                                Verified Present (Pass)
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold uppercase">
                                <input
                                    required
                                    type="radio"
                                    name="allergenZones"
                                    value="false"
                                    defaultChecked={activeProfile?.hasDedicatedAllergenZones === false}
                                    className="w-4 h-4 accent-black"
                                />
                                Not Implemented (Fail)
                            </label>
                        </div>
                    </div>

                    {/* Question 2: Standardized Portions */}
                    <div className="border-4 border-black p-4 bg-neutral-50 rounded-none space-y-3">
                        <h3 className="text-sm font-bold uppercase">
                            2. Recipe Standardization & Portion Scales
                        </h3>
                        <p className="text-[11px] text-neutral-500 leading-tight">
                            Are kitchen staff utilizing scales to measure the exact gram weights of ingredients (e.g. Kmaj bread portioning, olive oil drizzles) as submitted in the digital entries?
                        </p>
                        <div className="flex gap-4 pt-2">
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold uppercase">
                                <input
                                    required
                                    type="radio"
                                    name="standardRecipes"
                                    value="true"
                                    defaultChecked={activeProfile?.usesStandardizedRecipes === true}
                                    className="w-4 h-4 accent-black"
                                />
                                Verified Present (Pass)
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold uppercase">
                                <input
                                    required
                                    type="radio"
                                    name="standardRecipes"
                                    value="false"
                                    defaultChecked={activeProfile?.usesStandardizedRecipes === false}
                                    className="w-4 h-4 accent-black"
                                />
                                Not Implemented (Fail)
                            </label>
                        </div>
                    </div>

                    {/* establishment statistics context info */}
                    <div className="border-2 border-black p-3 bg-yellow-50 text-xs rounded-none">
                        <div className="font-bold uppercase mb-1">Establishment Recipe Progress:</div>
                        <p className="text-[11px] text-neutral-600 leading-tight">
                            This restaurant has <strong>{serializedRestaurant.recipes.length}</strong> active recipes.
                            If any of these are not yet digitally <strong>APPROVED</strong>, completing this audit will issue <strong>LEVEL 2</strong> status.
                            Once all are fully approved, it will automatically upgrade to <strong>LEVEL 3</strong> (ACTIVE).
                        </p>
                    </div>

                    {/* Action Triggers */}
                    <div className="flex gap-4 pt-4 border-t-2 border-black">
                        <button
                            type="submit"
                            className="flex-1 bg-green-500 hover:bg-green-600 text-black py-3 font-mono text-sm font-bold uppercase border-2 border-black rounded-none active:translate-x-1 active:translate-y-1 transition"
                        >
                            Log Site Audit & Update Compliance Levels
                        </button>
                        <Link
                            href="/auditor/queue"
                            className="bg-white border-2 border-black text-black px-6 py-3 font-mono text-sm font-bold uppercase rounded-none hover:bg-neutral-50 flex items-center justify-center"
                        >
                            Cancel
                        </Link>
                    </div>

                </form>

            </div>
        </div>
    );
}