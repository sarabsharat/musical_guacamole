import React from "react";
import { notFound } from "next/navigation";
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
    // 1. Authenticate & Secure the route using our new architecture
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
        <div>
            {/* Passing down the secure IDs the form might need */}
            <DraftResolutionForm
                currentUser={{ id: userId, restaurantId }}
                draft={serializedDraft}
                references={serializedReferences}
            />
        </div>
    );
}