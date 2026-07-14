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

    // 2. Query all active drafts specifically for this establishment (Tenant Isolation)
    const rawDrafts = await prisma.recipeDraft.findMany({
        where: { restaurant_id: restaurantId },
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
        <div>
            <div>
                <div>
                    <div>
                        <h1>Ingestion Queue</h1>
                        <p>
                            Active parsing processes. Items in <strong>RESOLVED</strong> status are ready for math validation.
                        </p>
                    </div>
                    <div>
                        <Link href="/submit">+ Ingest Raw Recipe</Link>
                        <Link href="/recipes">Active Portfolio</Link>
                    </div>
                </div>

                {/* Draft List Container */}
                <div>
                    {drafts.length === 0 ? (
                        <div>
                            <p>No active or historical ingestion processes found.</p>
                        </div>
                    ) : (
                        drafts.map((draft) => (
                            <div key={draft.id}>
                                <div>
                                    <div>
                                        <span>ID: #{draft.id}</span>
                                        <span>{new Date(draft.created_at).toLocaleString()}</span>
                                        <StatusBadge status={draft.status} />
                                    </div>

                                    <p>&ldquo;{draft.raw_input_text}&rdquo;</p>

                                    {draft.error_message && (
                                        <div>Error: {draft.error_message}</div>
                                    )}
                                </div>

                                <div>
                                    {draft.status === DraftStatus.RESOLVED ? (
                                        <Link href={`/owner/drafts/${draft.id}`}>
                                            Resolve Mappings &rarr;
                                        </Link>
                                    ) : draft.status === DraftStatus.PROCESSING ? (
                                        <div>Processing AI...</div>
                                    ) : (
                                        <button disabled>Resolution Locked</button>
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