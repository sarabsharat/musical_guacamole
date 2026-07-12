// src/app/owner/submit/layout.tsx
import React from "react";
import {requireOwnerAuth} from "@/lib/RequireOwnerAuth";
import SubmitRecipeForm from "@/components/owner/SubmitRecipeForm";

export default async function SubmitRecipePage() {
    const { currentUser, tenant } = await requireOwnerAuth();

   return (
        <SubmitRecipeForm
            currentUser={currentUser}
            tenant={tenant}
        />
    );
}