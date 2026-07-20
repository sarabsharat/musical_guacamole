"use client";

import React from "react";
import { useTranslation } from "react-i18next";

/**
 * Single source of truth for status -> color across the whole app.
 * Both the officer dashboard and the owner dashboard import this so
 * "APPROVED" (etc.) always means the same color everywhere.
 */
const STATUS_COLOR: Record<string, string> = {
    PENDING: "var(--carbs)",
    APPROVED: "var(--protein)",
    REJECTED: "var(--destructive)",
    REVOKED: "var(--wine)",
    FLAGGED: "var(--fats)",
};

export function getStatusColor(status: string) {
    return STATUS_COLOR[status] ?? "var(--muted-foreground)";
}

// Map status to translation key
const STATUS_TRANSLATION_KEY: Record<string, string> = {
    PENDING: "status.pending",
    APPROVED: "status.approved",
    REJECTED: "status.rejected",
    REVOKED: "status.revoked",
    FLAGGED: "status.flagged",
};

export function StatusBadge({ status }: { status: string }) {
    const { t } = useTranslation("common");
    const color = getStatusColor(status);
    const label = t(STATUS_TRANSLATION_KEY[status] || status, { defaultValue: status });

    return (
        <span
            className="inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-bold uppercase tracking-wide"
            style={{
                color,
                borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
                backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
            }}
        >
            {label}
        </span>
    );
}