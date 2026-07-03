// app/owner/drafts/page.tsx.tsx
import React from "react";
import { prisma } from "@/lib/prisma";
import { serializePrisma } from "@/lib/serialize";
import { StatusBadge } from "@/components/shared/status-badge";
import Link from "next/link";
import { DraftStatus, Role } from "@prisma/client";
import { getSession, assertUserAccess } from "@/lib/security";

export const revalidate = 0; // Disable caching to fetch live background updates

export default async function DraftsQueuePage() {
    // 1. Resolve user session context dynamically [5]
    const currentUser = await getSession();

    // 2. 🚨 SECURITY: Root-level guardrail for this owner's drafts page.tsx
    await assertUserAccess(currentUser, [Role.restaurant_owner], currentUser?.restaurantId);

    // 3. Query all active drafts specifically for this establishment [5]
    const rawDrafts = await prisma.recipeDraft.findMany({
        where: { restaurant_id: currentUser!.restaurantId! }, // Tenant Isolation
        orderBy: { created_at: "desc" },
    });

    const drafts = serializePrisma(rawDrafts) as Array<{
        id: number;
        raw_input_text: string;
        image_url: string | null;
        status: DraftStatus;
        error_message: string | null;
        created_at: string;
    }>;

    return (
        <div className="min-h-screen bg-neutral-100 p-8 text-black">
            <div className="mx-auto max-w-4xl border-4 border-black bg-white p-6 rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-4 border-black pb-4 mb-6">
                    <div>
                        <h1 className="font-mono text-3xl font-extrabold uppercase tracking-tight">
                            Ingestion Queue
                        </h1>
                        <p className="font-mono text-xs text-neutral-600 mt-1">
                            Active parsing processes. Items in <strong>RESOLVED</strong> status are ready for math validation.
                        </p>
                    </div>
                    <div className="mt-4 md:mt-0 flex gap-2 font-mono">
                        <Link
                            href="/submit"
                            className="bg-black text-white px-4 py-2 font-bold text-xs uppercase border-2 border-black rounded-none hover:bg-neutral-800 transition"
                        >
                            + Ingest Raw Recipe
                        </Link>
                        <Link
                            href="/recipes"
                            className="bg-white text-black px-4 py-2 font-bold text-xs uppercase border-2 border-black rounded-none hover:bg-neutral-50 transition"
                        >
                            Active Portfolio
                        </Link>
                    </div>
                </div>

                {/* Draft List Container */}
                <div className="space-y-4">
                    {drafts.length === 0 ? (
                        <div className="border-4 border-dashed border-black p-8 text-center bg-neutral-50 rounded-none">
                            <p className="font-mono text-sm text-neutral-500">
                                No active or historical ingestion processes found.
                            </p>
                        </div>
                    ) : (
                        drafts.map((draft) => (
                            <div
                                key={draft.id}
                                className="border-4 border-black p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white rounded-none hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition"
                            >
                                <div className="space-y-2 max-w-2xl">
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-xs font-bold text-neutral-400">
                                            ID: #{draft.id}
                                        </span>
                                        <span className="font-mono text-[10px] text-neutral-500">
                                            {new Date(draft.created_at).toLocaleString()}
                                        </span>
                                        <StatusBadge status={draft.status} />
                                    </div>

                                    <p className="font-mono text-xs font-semibold line-clamp-2 text-neutral-800 bg-neutral-50 p-2 border border-neutral-300">
                                        &ldquo;{draft.raw_input_text}&rdquo;
                                    </p>

                                    {draft.error_message && (
                                        <div className="bg-red-50 border border-red-400 text-red-700 p-2 font-mono text-[10px] uppercase">
                                            Error: {draft.error_message}
                                        </div>
                                    )}
                                </div>

                                <div className="w-full md:w-auto flex items-center justify-end">
                                    {draft.status === DraftStatus.RESOLVED ? (
                                        <Link
                                            href={`/owner/drafts/${draft.id}`}
                                            className="w-full md:w-auto text-center bg-green-500 text-black border-2 border-black px-4 py-2 font-mono text-xs font-bold uppercase rounded-none hover:bg-green-600 transition"
                                        >
                                            Resolve Mappings &rarr;
                                        </Link>
                                    ) : draft.status === DraftStatus.PROCESSING ? (
                                        <div className="w-full md:w-auto text-center border-2 border-black bg-yellow-100 px-4 py-2 font-mono text-xs font-bold uppercase rounded-none animate-pulse">
                                            Processing AI...
                                        </div>
                                    ) : (
                                        <button
                                            disabled
                                            className="w-full md:w-auto border-2 border-black bg-neutral-100 text-neutral-400 px-4 py-2 font-mono text-xs font-bold uppercase rounded-none cursor-not-allowed"
                                        >
                                            Resolution Locked
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

            </div>
        </div>
    );
}