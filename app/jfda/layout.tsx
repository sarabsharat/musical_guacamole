// src/app/jfda/layout.tsx
import React from "react";
import { Header } from "@/components/shared/Header";
import { auth } from "@/lib/auth"; // ✅ server‑side auth

export default async function JFDALayout({ children }: { children: React.ReactNode }) {
    const session = await auth();
    const role = session?.user?.role || null;

    return (
        <div className="flex min-h-screen flex-col bg-background font-sans antialiased">
            <Header role={role} title="JFDA Officer" />
            <main className="flex-1">{children}</main>
        </div>
    );
}