// src/app/owner/layout.tsx
import React from "react";
import { getTenantContext } from "@/lib/tenant";
import { notFound } from "next/navigation";
import { Header } from "@/components/shared/Header";
import { getServerSession } from "@/lib/auth";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
    const tenant = await getTenantContext();
    if (!tenant) return notFound();

    const session = await getServerSession();
    const role = session?.role || null;

    return (
        <div className="flex min-h-screen flex-col bg-background font-sans antialiased">
            <Header role={role} tenant={tenant} />
            <main className="flex-1">{children}</main>
        </div>
    );
}