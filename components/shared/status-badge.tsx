// components/shared/status-badge.tsx
"use client";

import React from "react";
import { useTranslation } from "react-i18next";


const STATUS_COLOR: Record<string, string> = {
    PENDING: "var(--carbs)",
    APPROVED: "var(--protein)",
    REJECTED: "var(--fats)",
    REVOKED: "var(--fats)",
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
    const { t } = useTranslation();
    const color = getStatusColor(status);

    // ✅ If translation key exists, use it; otherwise use the raw status
    const label = STATUS_TRANSLATION_KEY[status]
        ? t(STATUS_TRANSLATION_KEY[status], { defaultValue: status })
        : status;

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