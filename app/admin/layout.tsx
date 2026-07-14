// src/app/admin/layout.tsx
import React from "react";
import { requireAdminAuth } from "@/lib/Authentication/RequireAdminAuth";
import { Header } from "@/components/shared/Header";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    // 1. 🚨 SECURITY: Lock down the entire /admin directory
    // If they aren't a system_admin, this instantly kicks them to /login
    await requireAdminAuth();

    return (
        <div className="flex min-h-screen flex-col bg-background font-sans antialiased">
            <Header role="platform_admin" title="Platform Admin" />
            <main className="flex-1">{children}</main>
        </div>
    );
}