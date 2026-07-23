// app/auditor/data-context.ts
"use client";

import { createContext, useContext, useMemo } from "react";

export interface AuditorData {
    recentLogs: any[];
    readIds: number[];
    metrics: {
        reviewsDone: number;
        pending: number;
        approved: number;
        rejected: number;
        approvalRate: number;
    } | null;
    queue: any[];
}

const AuditorDataContext = createContext<AuditorData | null>(null);

export function AuditorDataProvider({ children, data }: { children: React.ReactNode; data: AuditorData }) {
    // ✅ Memoize the data to prevent re-renders
    const memoizedData = useMemo(() => data, [data]);

    return (
        <AuditorDataContext.Provider value={memoizedData}>
            {children}
        </AuditorDataContext.Provider>
    );
}

export function useAuditorData() {
    const context = useContext(AuditorDataContext);
    if (!context) {
        throw new Error("useAuditorData must be used within AuditorDataProvider");
    }
    return context;
}