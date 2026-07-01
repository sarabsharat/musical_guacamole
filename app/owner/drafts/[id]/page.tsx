// app/owner/drafts/[id]/page.tsx
import React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serializePrisma } from "@/lib/serialize";
import { DraftResolutionForm } from "@/components/owner/draft-resolution-form";
import { Role } from "@prisma/client";
import { getSession, assertUserAccess } from "@/lib/security";

export const revalidate = 0;

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function DraftResolutionPage({ params }: PageProps) {
    // 1. Fetch the session
    const currentUser = await getSession();

    // 2. 🚨 UNIFIED PAGE-LEVEL GUARDRAIL 🚨
    // This handles session existence, role checking, and tenant header validation in one call
    await assertUserAccess(currentUser, [Role.restaurant_owner], currentUser?.restaurantId);

    // 3. Resolve dynamic routing params
    const { id } = await params;
    const draftId = parseInt(id, 10);

    if (isNaN(draftId)) {
        return notFound();
    }

    // 4. Fetch the Draft using strict tenant isolation
    // currentUser is guaranteed to be non-null by assertUserAccess
    const draftData = await prisma.recipeDraft.findFirst({
        where: {
            id: draftId,
            restaurant_id: currentUser!.restaurantId!,
        },
    });

    if (!draftData) {
        return notFound();
    }

    // 5. Fetch the custom localized reference library
    const references = await prisma.ingredientReference.findMany({
        orderBy: { name: "asc" },
    });

    // 6. Serialize data
    const serializedDraft = serializePrisma(draftData);
    const serializedReferences = serializePrisma(references);

    return (
        <div className="min-h-screen bg-neutral-100 p-8 text-black">
            <DraftResolutionForm
                currentUser={currentUser!}
                draft={serializedDraft}
                references={serializedReferences}
            />
        </div>
    );
}
