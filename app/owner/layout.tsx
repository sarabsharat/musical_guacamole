import React from "react";
import { getTenantContext } from "@/lib/tenant";
import { notFound } from "next/navigation";
import { Header } from "@/components/shared/Header";
import { Sidebar } from "@/components/shared/Sidebar";
import { auth } from "@/lib/auth"; // 👈 changed from getServerSession

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
    const tenant = await getTenantContext();
    if (!tenant) return notFound();

    const session = await auth(); // 👈 use auth()
    const role = session?.user?.role || null;

    return (
        <div className="flex min-h-screen flex-col bg-background font-sans antialiased">
            <Header role={role} tenant={tenant} />
            <div className="flex flex-1">
                <Sidebar
                    tenantName={tenant.business_name}
                    role={role?.replace("_", " ") || "Owner"}
                />
                <main className="flex-1 px-4 py-6 md:px-8 md:py-8 overflow-x-hidden">
                    {children}
                </main>
            </div>
        </div>
    );
}