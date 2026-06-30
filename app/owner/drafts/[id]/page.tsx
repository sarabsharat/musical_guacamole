import React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serializePrisma } from "@/lib/serialize";
import { DraftResolutionForm } from "@/components/owner/draft-resolution-form";
import { SessionUser } from "@/lib/security";

const MOCK_OWNER_SESSION: SessionUser = {
    id: 1,
    role: "restaurant_owner",
    restaurantId: 1, // Matches Al-Quds Kitchen
};

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function DraftResolutionPage({ params }: PageProps) {
    const { id } = await params;
    const draftId = parseInt(id, 10);

    if (isNaN(draftId)) {
        return notFound();
    }

    // 1. Fetch the Draft and ensure ownership tenancy checks
    const draftData = await prisma.recipeDraft.findFirst({
        where: {
            id: draftId,
            restaurant_id: MOCK_OWNER_SESSION.restaurantId,
        },
    });

    if (!draftData) {
        return notFound();
    }

    // 2. Fetch the custom localized reference library for mapping dropdowns
    const references = await prisma.ingredientReference.findMany({
        orderBy: { name: "asc" },
    });

    // 3. Serialize data safely across Next.js boundary
    const serializedDraft = serializePrisma(draftData);
    const serializedReferences = serializePrisma(references);

    return (
        <div className="min-h-screen bg-neutral-100 p-8 text-black">
            <DraftResolutionForm
                currentUser={MOCK_OWNER_SESSION}
                draft={serializedDraft}
                references={serializedReferences}
            />
        </div>
    );
}