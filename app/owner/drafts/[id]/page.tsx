import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link"; // FIX: Correct import for navigation
import { prisma } from "@/lib/prisma";
import { serializePrisma } from "@/lib/serialize";
import { DraftResolutionForm } from "@/components/owner/draft-resolution-form";
import { requireOwnerAuth } from "@/lib/Authentication/RequireOwnerAuth";

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function DraftResolutionPage({ params }: PageProps) {
    // 1. Authenticate & Secure the route
    const { userId, restaurantId } = await requireOwnerAuth();

    // 2. Resolve dynamic parameters
    const { id } = await params;
    const draftId = parseInt(id, 10);

    if (isNaN(draftId)) {
        return notFound();
    }

    // 3. Fetch the Draft using strict tenant isolation
    const draftData = await prisma.recipeDraft.findFirst({
        where: {
            id: draftId,
            restaurant_id: restaurantId,
        },
    });

    if (!draftData) {
        return notFound();
    }

    // 4. Fetch reference ingredient library
    const references = await prisma.ingredientReference.findMany({
        orderBy: { name: "asc" },
    });

    // 5. Serialize database objects
    const serializedDraft = serializePrisma(draftData);
    const serializedReferences = serializePrisma(references);

    return (
        <main className="min-h-screen bg-background p-6">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header: Contextual Navigation */}
                <header className="flex justify-between items-center border-b border-border pb-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Resolution Center</h1>
                        <p className="text-muted-foreground">Draft ID #{draftId} • {new Date(draftData.created_at).toLocaleDateString()}</p>
                    </div>
                    <Link
                        href="/owner/drafts"
                        className="text-sm text-primary hover:underline font-medium"
                    >
                        ← Back to Queue
                    </Link>
                </header>

                {/* The Workspace */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left: Source Context */}
                    <aside className="lg:col-span-1 space-y-4">
                        <div className="bg-card p-6 rounded-xl border border-border">
                            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">Raw Input</h2>
                            <p className="text-lg leading-relaxed text-foreground italic">
                                "{draftData.raw_input_text}"
                            </p>
                        </div>
                    </aside>

                    {/* Right: Interaction Form */}
                    <section className="lg:col-span-2">
                        <div className="bg-card p-8 rounded-xl border border-border shadow-2xl">
                            <DraftResolutionForm
                                currentUser={{ id: userId, restaurantId }}
                                draft={serializedDraft}
                                references={serializedReferences}
                            />
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}