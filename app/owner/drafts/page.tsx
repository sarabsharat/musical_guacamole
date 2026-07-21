import React from "react";
import { prisma } from "@/lib/prisma";
import { serializePrisma } from "@/lib/serialize";
import { requireOwnerAuth } from "@/lib/Authentication/RequireOwnerAuth";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import DraftsList from "@/components/owner/drafts-list"; // 👈 import Prisma

export const revalidate = 0;

export default async function DraftsQueuePage() {
    const { restaurantId } = await requireOwnerAuth();

    const where: Prisma.RecipeDraftWhereInput = { restaurant_id: restaurantId }; // ✅ fixed
    const rawDrafts = await prisma.recipeDraft.findMany({
        where,
        orderBy: [{ status: 'asc' }, { created_at: 'desc' }],
    });
    const drafts = serializePrisma(rawDrafts);

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

            <DraftsList drafts={drafts} />
        </div>
    );
}