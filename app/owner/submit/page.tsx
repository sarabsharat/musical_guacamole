// src/app/owner/submit/page.tsx
import React from "react";
import { requireOwnerAuth } from "@/lib/Authentication/RequireOwnerAuth";
import SubmitRecipeForm from "@/components/owner/SubmitRecipeForm";

export default async function SubmitRecipePage() {
    // 1. 🚨 SECURITY: The un-hackable Auth Wall
    const { userId, restaurantId } = await requireOwnerAuth();

    // 2. Reconstruct the mock objects to satisfy your existing Client Component's props
    const mockUser = { id: userId, restaurantId, role: "restaurant_owner" } as any;
    const mockTenant = { id: restaurantId } as any;

    return (
        <div className="min-h-screen bg-neutral-100 p-8 text-black">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="pb-4 border-b border-border">
                    <h1 className="text-3xl font-bold tracking-tight">Ingest Raw Recipe Notes</h1>
                    <p className="text-muted-foreground mt-1">
                        Submit unstructured text or an image of a recipe to have the AI parse and draft it into the system.
                    </p>
                </div>

                <SubmitRecipeForm
                    currentUser={mockUser}
                    tenant={mockTenant}
                />
            </div>
        </div>
    );
}