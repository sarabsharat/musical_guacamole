// src/app/layout.tsx
import React from "react";
import { getTenantContext } from "@/lib/tenant";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

interface RootLayoutProps {
    children: React.ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
    // 1. Resolve tenant context securely on standard Node.js runtime
    const tenant = await getTenantContext();

    // Inspect current request path [4]
    const headerList = await headers();
    const pathname = headerList.get("x-pathname") || "";

    // 2. Identify administrative or authentication directories
    const isAdministrativeRoute =
        pathname.startsWith("/auditor") ||
        pathname.startsWith("/jfda") ||
        pathname.startsWith("/auth");

    // If a tenant subdomain was routed but isn't found in our database records, fail silently
    if (!tenant && !isAdministrativeRoute && typeof window !== "undefined" && window.location.host.split(".").length > 1) {
        return notFound();
    }

    return (
        <html lang="en">
        <body className="min-h-screen bg-neutral-100 font-mono antialiased text-black">

        {/* Multitenant Layout Wrapper — Render only for non-administrative tenant views */}
        {tenant && !isAdministrativeRoute ? (
            <div className="flex flex-col min-h-screen">
                {/* Brutalist Tenant Top Bar Banner */}
                <header className="border-b-4 border-black bg-yellow-400 p-4 flex justify-between items-center rounded-none">
                    <div className="flex items-center gap-3">
                        <span className="bg-black text-white px-2 py-0.5 text-xs font-bold uppercase rounded-none">
                            Tenant Portal
                        </span>
                        <span className="font-extrabold uppercase text-sm tracking-tight">
                            {tenant.business_name}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold">
                        <span className="border border-black px-1.5 py-0.5 bg-white uppercase">
                            Level {tenant.cert_level.replace("LEVEL_", "")}
                        </span>
                        <span className="border border-black px-1.5 py-0.5 bg-black text-white uppercase">
                            {tenant.cert_status}
                        </span>
                    </div>
                </header>

                {/* Render child elements */}
                <main className="flex-grow">{children}</main>
            </div>
        ) : (
            /* Render standard layouts (e.g. general landing portal, auditor terminate, JFDA registry) */
            <main className="min-h-screen">{children}</main>
        )}

        </body>
        </html>
    );
}