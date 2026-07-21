"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteDraft } from "@/actions/DraftsActions";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DeleteDraftButtonProps {
    draftId: number;
    redirectToQueue?: boolean;
}

export function DeleteDraftButton({ draftId, redirectToQueue = false }: DeleteDraftButtonProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this draft?")) return;

        setLoading(true);
        const res = await deleteDraft({ id: draftId });
        setLoading(false);

        if (!res.success) {
            toast.error(res.message); // Displays rate limit or error toast
            return;
        }

        toast.success(res.message);

        if (redirectToQueue) {
            router.push("/owner/drafts");
        }
    };

    return (
        <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={loading}
            className="gap-2 font-medium"
        >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete Draft
        </Button>
    );
}