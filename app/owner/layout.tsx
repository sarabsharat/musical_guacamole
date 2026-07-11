// src/app/owner/layout.tsx
import React from "react";
import { getTenantContext } from "@/lib/tenant";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import {Header}  from "@/components/shared/Header";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
    const tenant = await getTenantContext();
    if (!tenant) return notFound();

    const session = await getSession();
    const role = session?.role || null;

    return (
        <div className="flex min-h-screen flex-col bg-background font-sans antialiased">
            <Header role={role} tenant={tenant} />
            <main className="flex-1">{children}</main>
        </div>
    );
}