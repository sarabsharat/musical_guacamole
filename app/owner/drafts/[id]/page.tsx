// app/owner/drafts/[id]/page.tsx
import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { serializePrisma } from "@/lib/serialize";
import { DraftResolutionForm } from "@/components/owner/draft-resolution-form";
import { requireOwnerAuth } from "@/lib/Authentication/RequireOwnerAuth";
import { ArrowLeft } from "lucide-react";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function DraftResolutionPage({ params }: PageProps) {
    const { userId, restaurantId } = await requireOwnerAuth();
    const { id } = await params;
    const draftId = parseInt(id, 10);

    if (isNaN(draftId)) return notFound();

    const draftData = await prisma.recipeDraft.findFirst({
        where: { id: draftId, restaurant_id: restaurantId },
    });

    if (!draftData) return notFound();

    const references = await prisma.ingredientReference.findMany({
        orderBy: { name: "asc" },
    });

    const serializedDraft = serializePrisma(draftData);
    const serializedReferences = serializePrisma(references);

    return (
        <main className="p-6 md:p-8 space-y-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">
                            Resolution Center
                        </h1>
                        <p className="text-base text-muted-foreground mt-1">
                            Draft ID #{draftId} • {new Date(draftData.created_at).toLocaleDateString()}
                        </p>
                    </div>
                    <Link
                        href="/owner/drafts"
                        className="inline-flex items-center gap-2 text-primary hover:underline font-medium text-base"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Queue
                    </Link>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <aside className="lg:col-span-1 space-y-4">
                        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
                            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                                Raw Input
                            </h2>
                            <p className="text-lg leading-relaxed text-foreground italic">
                                “{draftData.raw_input_text}”
                            </p>
                        </div>
                    </aside>

                    <section className="lg:col-span-2">
                        <div className="bg-card p-6 md:p-8 rounded-xl border border-border shadow-sm">
                            <DraftResolutionForm
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