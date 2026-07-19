import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {getDashboardData} from "@/components/jfda/dashboard-data";
import DashboardClient from "@/components/jfda/dashboard-client";
import {requireJfdaAuth} from "@/lib/Authentication/RequireJfdaAuth";

export default async function DashboardPage() {
    const { user } = await requireJfdaAuth();

    // 2. Safely extract the data now that we know they are a verified officer
    const fullName = user?.name || "JFDA Officer";

    // 3. Fetch the dashboard metrics
    const data = await getDashboardData();

    return (
        <DashboardClient
            userFullName={fullName}
            {...data}
        />
    );
}