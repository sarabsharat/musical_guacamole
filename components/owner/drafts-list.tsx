"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { Trash2, Loader2 } from "lucide-react";
import { deleteDraft } from "@/actions/DraftsActions";

type Draft = {
    id: number;
    raw_input_text: string;
    image_url: string | null;
    status: string;
    error_message: string | null;
    created_at: string;
};

export default function DraftsList({ drafts }: { drafts: Draft[] }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const allSelected = drafts.length > 0 && drafts.every((d) => selectedIds.has(d.id));
    const someSelected = selectedIds.size > 0 && !allSelected;

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(drafts.map((d) => d.id)));
        }
    };

    const toggleSelect = (id: number) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleDelete = () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Delete ${selectedIds.size} draft(s)?`)) return;

        startTransition(async () => {
            await deleteDraft(Array.from(selectedIds));
            setSelectedIds(new Set());
            router.refresh();
        });
    };

    if (drafts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
                <p className="text-base text-muted-foreground">No drafts yet.</p>
                <Link href="/owner/submit" className="mt-4">
                    <span className="text-primary font-semibold hover:underline">
                        Create your first ingestion →
                    </span>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Checkbox
                        checked={allSelected}
                        indeterminate={someSelected}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all drafts"
                    />
                    <span className="text-sm text-muted-foreground">
                        {selectedIds.size} selected
                    </span>
                </div>

                {selectedIds.size > 0 && (
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                        disabled={isPending}
                        className="gap-2"
                    >
                        {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Trash2 className="h-4 w-4" />
                        )}
                        Delete Selected
                    </Button>
                )}
            </div>

            <div className="grid gap-4">
                {drafts.map((draft) => (
                    <div
                        key={draft.id}
                        className={`p-5 md:p-6 rounded-xl border transition-colors hover:bg-muted/30 ${
                            selectedIds.has(draft.id)
                                ? 'border-primary/50 bg-primary/5'
                                : draft.status === 'RESOLVED'
                                    ? 'border-primary/20 bg-primary/5'
                                    : 'border-border bg-card'
                        }`}
                    >
                        <div className="flex items-start gap-4">
                            <div className="pt-1">
                                <Checkbox
                                    checked={selectedIds.has(draft.id)}
                                    onCheckedChange={() => toggleSelect(draft.id)}
                                    aria-label={`Select draft ${draft.id}`}
                                />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-sm font-medium text-muted-foreground">
                                            #{draft.id}
                                        </span>
                                        <StatusBadge status={draft.status} />
                                    </div>
                                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                                        {new Date(draft.created_at).toLocaleDateString()}
                                    </span>
                                </div>

                                <p className="text-base italic my-3 text-foreground/80 line-clamp-2">
                                    “{draft.raw_input_text}”
                                </p>

                                <div className="mt-4 flex items-center justify-end">
                                    {draft.status === 'RESOLVED' ? (
                                        <Link
                                            href={`/owner/drafts/${draft.id}`}
                                            className="text-primary font-semibold hover:underline text-base"
                                        >
                                            Review & Finalize →
                                        </Link>
                                    ) : draft.status === 'PROCESSING' ? (
                                        <div className="flex items-center text-muted-foreground text-sm">
                                            <div className="animate-spin mr-2 h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                                            AI Parsing...
                                        </div>
                                    ) : (
                                        <span className="text-xs text-muted-foreground uppercase tracking-wider">
                                            Locked
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}