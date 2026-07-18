// src/app/owner/submit/page.tsx
import React from "react";
import { requireOwnerAuth } from "@/lib/Authentication/RequireOwnerAuth";
import SubmitRecipeForm from "@/components/owner/SubmitRecipeForm";

export default async function SubmitRecipePage() {
    // 1. 🚨 SECURITY: The un-hackable Auth Wall
    const { userId, restaurantId } = await requireOwnerAuth();

    // 2. Reconstruct the mock objects
    const mockUser = { id: userId, restaurantId, role: "restaurant_owner" } as any;
    const mockTenant = { id: restaurantId } as any;

    return (
        <main className="p-6 md:p-8 space-y-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <header className="pb-6 border-b border-border">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        Ingest Raw Recipe
                    </h1>
                    <p className="text-base text-muted-foreground mt-1">
                        Submit unstructured text or an image. The AI will parse it and place it in your Drafts Queue.
                    </p>
                </header>

                {/* Form Card */}
                <div className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-sm">
                    <SubmitRecipeForm
                        currentUser={mockUser}
                        tenant={mockTenant}
                    />
                </div>
            </div>
        </main>
    );
}