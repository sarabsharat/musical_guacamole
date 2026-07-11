// src/components/shared/status-badge.tsx
import React from "react";
import { RecipeStatus, DraftStatus, CertStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType = RecipeStatus | DraftStatus | CertStatus;

interface BadgeProps {
    status: StatusType;
    className?: string; // Allows for additional styling overrides if needed
}

export function StatusBadge({ status, className }: BadgeProps) {
    let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
    let customClasses = "";

    switch (status) {
        case "APPROVED":
        case "RESOLVED":
        case "ACTIVE":
            // Soft green for success states
            variant = "secondary";
            customClasses = "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-transparent";
            break;

        case "PENDING":
        case "PROCESSING":
            // Soft amber for waiting states (removed the harsh pulse)
            variant = "secondary";
            customClasses = "bg-amber-100 text-amber-800 hover:bg-amber-200 border-transparent";
            break;

        case "REJECTED":
        case "FAILED":
            // Uses Shadcn's built-in destructive (red) theme
            variant = "destructive";
            break;

        case "REVOKED":
            // Uses Shadcn's default primary color (usually solid black/dark gray)
            variant = "default";
            break;
    }

    return (
        <Badge
            variant={variant}
            className={cn(
                "px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                customClasses,
                className
            )}
        >
            {status}
        </Badge>
    );
}