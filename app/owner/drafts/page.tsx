// app/owner/drafts/page.tsx
import React from "react";
import { prisma } from "@/lib/prisma";
import { serializePrisma } from "@/lib/serialize";
import { StatusBadge } from "@/components/shared/status-badge";
import Link from "next/link";
import { DraftStatus } from "@prisma/client";
import { requireOwnerAuth } from "@/lib/Authentication/RequireOwnerAuth";
import { Plus } from "lucide-react";

export const revalidate = 0;

export default async function DraftsQueuePage() {
    const { restaurantId } = await requireOwnerAuth();

    const rawDrafts = await prisma.recipeDraft.findMany({
        where: { restaurant_id: restaurantId },
        orderBy: [{ status: 'asc' }, { created_at: 'desc' }],
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
        <div className="p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Ingestion Queue</h1>
                    <p className="text-base text-muted-foreground mt-1">
                        Manage your AI‑parsed ingredient drafts.
                    </p>
                </div>
                <Link
                    href="/owner/submit"
                    className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-lg text-base font-semibold transition-all"
                >
                    <Plus className="h-5 w-5" />
                    New Ingestion
                </Link>
            </div>

            <div className="grid gap-4">
                {drafts.map((draft) => (
                    <div
                        key={draft.id}
                        className={`p-5 md:p-6 rounded-xl border ${
                            draft.status === 'RESOLVED'
                                ? 'border-primary/50 bg-primary/5'
                                : 'border-border bg-card'
                        } transition-colors hover:bg-muted/30`}
                    >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-sm font-medium text-muted-foreground">
                                    #{draft.id}
                                </span>
                                <StatusBadge status={draft.status} />
                            </div>
                            <span className="text-sm text-muted-foreground">
                                {new Date(draft.created_at).toLocaleDateString()}
                            </span>
                        </div>

                        <p className="text-base italic my-3 text-foreground/80 line-clamp-2">
                            “{draft.raw_input_text}”
                        </p>

                        <div className="mt-4 flex items-center justify-end">
                            {draft.status === 'RESOLVED' ? (
                                <Link
                                    href={`/owner/drafts/${draft.id}`}
                                    className="text-primary font-semibold hover:underline text-base"
                                >
                                    Review & Finalize →
                                </Link>
                            ) : draft.status === 'PROCESSING' ? (
                                <div className="flex items-center text-muted-foreground text-sm">
                                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                                    AI Parsing...
                                </div>
                            ) : (
                                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                                    Locked
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {drafts.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
                    <p className="text-base text-muted-foreground">No drafts yet.</p>
                    <Link href="/owner/submit" className="mt-4">
                        <span className="text-primary font-semibold hover:underline">
                            Create your first ingestion →
                        </span>
                    </Link>
                </div>
            )}
        </div>
    );
}