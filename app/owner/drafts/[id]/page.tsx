import React from "react";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serializePrisma } from "@/lib/serialize";
import { DraftResolutionForm } from "@/components/owner/draft-resolution-form";
import { assertUserAccess } from "@/lib/security";
import { Role } from "@prisma/client";
import { getSession } from "@/lib/auth";

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function DraftResolutionPage({ params }: PageProps) {
    // 1. Fetch the central mock session
    const currentUser = await getSession();

    if (!currentUser) {
        redirect("/auth/login");
    }

    // 2. 🚨 PAGE-LEVEL GUARDRAIL 🚨
    // Kicks out anyone who isn't a restaurant owner or is missing a tenant ID
    await assertUserAccess(currentUser, [Role.restaurant_owner], currentUser.restaurantId);

    if (!currentUser.restaurantId) {
        throw new Error("Security Violation: No tenant context found.");
    }

    // 3. Resolve dynamic routing params
    const { id } = await params;
    const draftId = parseInt(id, 10);

    if (isNaN(draftId)) {
        return notFound();
    }

    // 4. Fetch the Draft using strict tenant isolation
    const draftData = await prisma.recipeDraft.findFirst({
        where: {
            id: draftId,
            restaurant_id: currentUser.restaurantId,
        },
    });

    if (!draftData) {
        return notFound();
    }

    // 5. Fetch the custom localized reference library for mapping dropdowns
    const references = await prisma.ingredientReference.findMany({
        orderBy: { name: "asc" },
    });

    // 6. Serialize data safely across Next.js boundary
    const serializedDraft = serializePrisma(draftData);
    const serializedReferences = serializePrisma(references);

    return (
        <div className="min-h-screen bg-neutral-100 p-8 text-black">
            <DraftResolutionForm
                currentUser={currentUser}
                draft={serializedDraft}
                references={serializedReferences}
            />
        </div>
    );
}