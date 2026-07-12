// src/app/admin/layout.tsx
import React from "react";
import { getSession } from "@/lib/auth";
import { Header } from "@/components/shared/Header";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await getSession();
    const role = session?.role || null;

    return (
        <div className="flex min-h-screen flex-col bg-background font-sans antialiased">
            <Header role={role} title="Platform Admin" />
            <main className="flex-1">{children}</main>
        </div>
    );
}