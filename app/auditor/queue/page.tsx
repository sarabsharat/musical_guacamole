// app/auditor/queue/page.tsx
import React from "react";
import { requireAuditorAuth } from "@/lib/Authentication/RequireAuditorAuth";
import { VerificationBanner } from "@/components/auditor/verification-banner";
import { AuditQueueList } from "@/components/auditor/audit-queue-list";
import { getPendingAuditQueue } from "@/actions/auditor/data/data";
import { serializePrisma } from "@/lib/serialize";

export default async function AuditorQueuePage({
                                                   searchParams,
                                               }: {
    searchParams: Promise<{ page?: string }>;
}) {
    const { verificationStatus } = await requireAuditorAuth();

    const params = await searchParams;
    const page = parseInt(params.page || "1", 10);
    const pageSize = 10;

    const result = await getPendingAuditQueue();
    const rawQueue = result.success ? (result.data ?? []) : [];

    // Calculate pagination
    const totalItems = rawQueue.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginatedQueue = rawQueue.slice(startIndex, startIndex + pageSize);

    // Serialize the queue for client components
    const queue = serializePrisma(paginatedQueue);

    return (
        <div className="flex flex-col gap-6 px-4 lg:px-6 py-4">
            <div className="border-b border-border pb-4">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Recipe Queue</h1>
                <p className="text-base text-muted-foreground mt-1">Review pending recipe submissions (Level 1 Digital Verification)</p>
            </div>

            <VerificationBanner verificationStatus={verificationStatus} />

            <AuditQueueList
                queue={queue}
                currentPage={page}
                totalPages={totalPages}
                variant="full"
                isLoading={!result.success}
            />
        </div>
    );
}