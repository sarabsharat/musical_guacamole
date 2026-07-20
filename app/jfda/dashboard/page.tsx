// app/jfda/dashboard/page.tsx
import React from "react";
import { getDashboardData } from "@/components/jfda/dashboard-data";
import DashboardClient from "@/components/jfda/dashboard-client";
import { requireJfdaAuth } from "@/lib/Authentication/RequireJfdaAuth";

export default async function DashboardPage() {
    const { user } = await requireJfdaAuth();
    const fullName = user?.name || "JFDA Officer";
    const data = await getDashboardData();

    return (
        <DashboardClient
            userFullName={fullName}
            {...data}
        />
    );
}