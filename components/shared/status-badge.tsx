import React from "react";
import { RecipeStatus, DraftStatus, CertStatus } from "@prisma/client";

type StatusType = RecipeStatus | DraftStatus | CertStatus;

interface BadgeProps {
    status: StatusType;
}

export function StatusBadge({ status }: BadgeProps) {
    let classes = "bg-neutral-100 text-neutral-800 border-neutral-400";

    switch (status) {
        case "APPROVED":
        case "RESOLVED":
        case "ACTIVE":
            classes = "bg-green-100 text-green-800 border-green-500 font-bold";
            break;
        case "PENDING":
        case "PROCESSING":
            classes = "bg-yellow-100 text-yellow-800 border-yellow-500 animate-pulse";
            break;
        case "REJECTED":
        case "FAILED":
            classes = "bg-red-100 text-red-800 border-red-500 font-bold";
            break;
        case "REVOKED":
            classes = "bg-neutral-900 text-white border-black font-extrabold";
            break;
    }

    return (
        <span
            className={`inline-block border-2 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide rounded-none ${classes}`}
        >
      {status}
    </span>
    );
}