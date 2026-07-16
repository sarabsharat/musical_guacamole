import React from "react";
import { prisma } from "@/lib/prisma";
import { serializePrisma } from "@/lib/serialize";
import { StatusBadge } from "@/components/shared/status-badge";
import Link from "next/link";
import { DraftStatus } from "@prisma/client";
import { requireOwnerAuth } from "@/lib/Authentication/RequireOwnerAuth";

export const revalidate = 0; // Disable caching to fetch live background updates

export default async function DraftsQueuePage() {
    // 1. Authenticate & Secure the route using our new architecture
    const { restaurantId } = await requireOwnerAuth();

    // Fetch with specific filtering to highlight "Needs Action" items
    const rawDrafts = await prisma.recipeDraft.findMany({
        where: { restaurant_id: restaurantId },
        orderBy: [{ status: 'asc' }, { created_at: 'desc' }], // Group RESOLVED at the top
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
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header with clear stats */}
            <header className="flex justify-between items-end mb-8 border-b pb-4">
                <div>
                    <h1 className="text-2xl font-bold">Ingestion Queue</h1>
                    <p className="text-muted-foreground">Manage your AI-parsed ingredient drafts.</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/recipes/new" className="bg-primary text-primary-foreground px-4 py-2 rounded-md">New Ingestion</Link>
                </div>
            </header>

            {/* The Queue Grid */}
            <div className="grid gap-4">
                {drafts.map((draft) => (
                    <div key={draft.id} className={`p-4 rounded-lg border ${draft.status === 'RESOLVED' ? 'border-primary/50 bg-primary/5' : 'border-border'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-sm">#{draft.id}</span>
                                <StatusBadge status={draft.status} />
                            </div>
                            <span className="text-xs text-muted-foreground">{new Date(draft.created_at).toLocaleDateString()}</span>
                        </div>

                        <p className="text-sm italic my-2 truncate">"{draft.raw_input_text}"</p>

                        {/* Action Area */}
                        <div className="mt-4 flex items-center justify-end">
                            {draft.status === 'RESOLVED' ? (
                                <Link
                                    href={`/owner/drafts/${draft.id}`}
                                    className="text-primary font-semibold hover:underline"
                                >
                                    Review & Finalize →
                                </Link>
                            ) : draft.status === 'PROCESSING' ? (
                                <div className="flex items-center text-muted-foreground text-sm">
                                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                                    AI Parsing...
                                </div>
                            ) : (
                                <span className="text-xs text-muted-foreground uppercase tracking-wider">Locked</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}