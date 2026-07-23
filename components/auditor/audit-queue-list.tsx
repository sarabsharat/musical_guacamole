// components/auditor/audit-queue-list.tsx
"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { StatusBadge } from "@/components/shared/status-badge";
import { Eye, ClipboardList, ArrowRight } from "lucide-react";
import { LoadingScreen } from "@/components/ui/loading-screen";

interface QueueItem {
    id: number;
    meal_name: string;
    status: string;
    restaurant?: {
        business_name: string;
    };
    created_at?: Date;
}

interface AuditQueueListProps {
    queue: QueueItem[];
    currentPage?: number;
    totalPages?: number;
    variant?: "full" | "recent";
    isLoading?: boolean;
}

export function AuditQueueList({
                                   queue,
                                   currentPage = 1,
                                   totalPages = 1,
                                   variant = "full",
                                   isLoading = false,
                               }: AuditQueueListProps) {
    const router = useRouter();
    const { t } = useTranslation();

    // ✅ Memoize the queue to prevent re-renders
    const memoizedQueue = useMemo(() => queue, [queue]);

    // Loading State
    if (isLoading) {
        return <LoadingScreen message={t('loading_queue', { defaultValue: 'Loading queue...' })} />;
    }

    // COMPACT RECENT VIEW (For Dashboards)
    if (variant === "recent") {
        if (!memoizedQueue || memoizedQueue.length === 0) {
            return (
                <section className="bg-card border border-border rounded-xl">
                    <div className="p-5 md:p-6 border-b border-border flex justify-between items-center">
                        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                            {t('pending_queue', { defaultValue: 'Pending Queue' })}
                        </h2>
                        <Link
                            href="/auditor/queue"
                            className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                        >
                            {t('view_all', { defaultValue: 'View All' })} <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <ClipboardList className="h-10 w-10 mb-2 opacity-30" />
                        <p className="text-sm">{t('queue_empty', { defaultValue: 'No pending recipes. Great job!' })}</p>
                    </div>
                </section>
            );
        }

        return (
            <section className="bg-card border border-border rounded-xl">
                <div className="p-5 md:p-6 border-b border-border flex justify-between items-center">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        {t('pending_queue', { defaultValue: 'Pending Queue' })}
                    </h2>
                    <Link
                        href="/auditor/queue"
                        className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                    >
                        {t('view_all', { defaultValue: 'View All' })} <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>

                <div className="divide-y divide-border/50">
                    {memoizedQueue.map((item) => (
                        <Link
                            href={`/auditor/queue/${item.id}`}
                            key={item.id}
                            className="flex justify-between items-center px-5 md:px-6 py-3 hover:bg-muted/40 transition-colors group cursor-pointer"
                        >
                            <div className="flex flex-col">
                                <span className="text-base font-medium text-foreground group-hover:text-primary transition-colors">
                                    {item.meal_name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {item.restaurant?.business_name || "Unknown Restaurant"}
                                </span>
                            </div>
                            <StatusBadge status={item.status} />
                        </Link>
                    ))}
                </div>
            </section>
        );
    }

    // FULL TABLE VIEW (For the Queue Page)
    const goToPage = (page: number) => {
        router.push(`/auditor/queue?page=${page}`);
    };

    if (memoizedQueue.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center transition-colors hover:bg-muted/30">
                <div className="rounded-full bg-primary/10 p-4">
                    <ClipboardList className="h-8 w-8 text-primary" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{t('queue_empty_title', { defaultValue: 'Queue is empty' })}</h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    {t('queue_empty_desc', { defaultValue: 'All recipes have been reviewed. Great job!' })}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableHead className="h-12 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('recipe_name', { defaultValue: 'Recipe Name' })}
                            </TableHead>
                            <TableHead className="h-12 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('restaurant', { defaultValue: 'Restaurant' })}
                            </TableHead>
                            <TableHead className="h-12 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('status', { defaultValue: 'Status' })}
                            </TableHead>
                            <TableHead className="h-12 text-right text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('action', { defaultValue: 'Action' })}
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {memoizedQueue.map((item) => (
                            <TableRow key={item.id} className="border-b border-border/50 transition-colors hover:bg-muted/40">
                                <TableCell className="py-3 text-base font-medium text-foreground">
                                    <Link href={`/auditor/queue/${item.id}`} className="hover:underline hover:text-primary transition-colors">
                                        {item.meal_name}
                                    </Link>
                                </TableCell>
                                <TableCell className="py-3 text-muted-foreground">
                                    {item.restaurant?.business_name || "Unknown"}
                                </TableCell>
                                <TableCell className="py-3">
                                    <StatusBadge status={item.status} />
                                </TableCell>
                                <TableCell className="py-3 text-right">
                                    <Link href={`/auditor/queue/${item.id}`}>
                                        <Button variant="secondary" size="sm" className="gap-2">
                                            <Eye className="h-4 w-4" />
                                            {t('review', { defaultValue: 'Review' })}
                                        </Button>
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {totalPages > 1 && (
                <Pagination className="pt-2">
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                onClick={() => currentPage > 1 && goToPage(currentPage - 1)}
                                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                            if (page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1) {
                                return (
                                    <PaginationItem key={page}>
                                        <PaginationLink
                                            isActive={page === currentPage}
                                            onClick={() => goToPage(page)}
                                        >
                                            {page}
                                        </PaginationLink>
                                    </PaginationItem>
                                );
                            }
                            if ((page === 2 && currentPage > 3) || (page === totalPages - 1 && currentPage < totalPages - 2)) {
                                return <PaginationEllipsis key={page} />;
                            }
                            return null;
                        })}
                        <PaginationItem>
                            <PaginationNext
                                onClick={() => currentPage < totalPages && goToPage(currentPage + 1)}
                                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            )}
        </div>
    );
}