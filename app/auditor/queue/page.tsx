// app/auditor/queue/page.tsx
import React from "react";
import { getPendingAuditQueue } from "@/actions/auditor";
import { getSession, assertUserAccess } from "@/lib/security";
import { StatusBadge } from "@/components/shared/status-badge";
import { Role } from "@prisma/client";
import Link from "next/link";
import { serializePrisma } from "@/lib/serialize";

export const revalidate = 0; // Disable static route caching for live queue updates

export default async function AuditorQueuePage() {
    // 1. Authenticate user context securely on server
    const session = await getSession();

    // 2. 🚨 SECURITY: Ensure only auditor role holds clearance to read queue
    await assertUserAccess(session, [Role.nutritionist_auditor, Role.platform_admin]);

    // 3. Retrieve raw queue data
    const response = await getPendingAuditQueue();

    if (!response.success || !response.data) {
        return (
            <div className="min-h-screen bg-neutral-100 p-8 text-black">
                <div className="border-4 border-red-600 bg-red-50 p-6 rounded-none">
                    <h2 className="font-mono text-xl font-bold uppercase text-red-600">Queue Fetch Mismatch</h2>
                    <p className="mt-2 font-mono text-xs text-red-700">{response.message}</p>
                </div>
            </div>
        );
    }

    const serializedQueue = serializePrisma(response.data);

    return (
        <div className="min-h-screen bg-neutral-100 p-8 text-black">
            <div className="mx-auto max-w-5xl border-4 border-black bg-white p-6 rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6">

                {/* Header Dashboard Banner */}
                <div className="border-b-4 border-black pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
            <span className="bg-black text-white px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded-none">
              JFDA Compliance Desk
            </span>
                        <h1 className="font-mono text-3xl font-extrabold uppercase mt-2">
                            Digital Verification Queue
                        </h1>
                        <p className="font-mono text-xs text-neutral-600 mt-1">
                            Review recipe ingredients, mathematical compliance, and visual deviance for Jordan establishments.
                        </p>
                    </div>
                    <div className="font-mono text-xs font-bold bg-neutral-100 border-2 border-black p-3 rounded-none">
                        Pending Reviews: {serializedQueue.length}
                    </div>
                </div>

                {/* Audit Stack */}
                <div className="space-y-4">
                    {serializedQueue.length === 0 ? (
                        <div className="border-4 border-dashed border-black bg-neutral-50 p-12 text-center rounded-none">
                            <p className="font-mono text-sm text-neutral-500 italic">
                                All digital menu options are fully audited. No pending reviews.
                            </p>
                        </div>
                    ) : (
                        serializedQueue.map((recipe: any) => (
                            <div
                                key={recipe.id}
                                className="border-4 border-black bg-white p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center rounded-none hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition"
                            >

                                {/* Visual Thumbnails */}
                                <div className="md:col-span-2">
                                    {recipe.image_url ? (
                                        <div className="w-full h-20 border-2 border-black overflow-hidden bg-neutral-100 relative">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={recipe.image_url}
                                                alt={recipe.meal_name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-full h-20 border-2 border-black bg-neutral-200 flex items-center justify-center font-mono text-[10px] uppercase text-neutral-500">
                                            No Photo Ingested
                                        </div>
                                    )}
                                </div>

                                {/* Recipe details */}
                                <div className="md:col-span-6 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-neutral-400">
                      ID: #{recipe.id}
                    </span>
                                        <span className="font-mono text-[10px] font-bold uppercase text-red-600 bg-red-50 border border-red-300 px-1.5 py-0.5">
                      {recipe.restaurant.business_name}
                    </span>
                                    </div>
                                    <h3 className="font-mono text-base font-extrabold uppercase leading-tight">
                                        {recipe.meal_name}
                                    </h3>
                                    <p className="font-mono text-[10px] text-neutral-500 line-clamp-1">
                                        Dictated Preparation: &ldquo;{recipe.preparation_notes}&rdquo;
                                    </p>
                                </div>

                                {/* Mathematical Yield Summaries */}
                                <div className="md:col-span-2 border-l-2 md:border-l-0 md:border-x-2 border-black px-3 py-1 font-mono">
                                    <div className="text-[9px] uppercase text-neutral-400">Math Verified Yield</div>
                                    <div className="text-xs font-bold mt-0.5">{recipe.calories} kcal</div>
                                    <div className="text-[9px] text-neutral-500 mt-0.5">
                                        P: {recipe.protein}g / C: {recipe.carbs}g / F: {recipe.total_fat}g
                                    </div>
                                </div>

                                {/* Queue Controls */}
                                <div className="md:col-span-2 text-right">
                                    <Link
                                        href={`/auditor/queue/${recipe.id}`}
                                        className="w-full block text-center bg-black hover:bg-neutral-800 text-white border-2 border-black py-2.5 font-mono text-xs font-bold uppercase rounded-none transition"
                                    >
                                        Perform Audit
                                    </Link>
                                </div>

                            </div>
                        ))
                    )}
                </div>

            </div>
        </div>
    );
}