// src/app/layout.tsx - FIXED VERSION
import React from "react";
import { getTenantContext } from "@/lib/tenant";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { LogoutButton } from "@/components/ui/logout-button";
import AuthProvider from "@/lib/utils/AuthProvider";

interface RootLayoutProps {
    children: React.ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {

    const tenant = await getTenantContext();
    console.log("🏢 Tenant in layout:", tenant);

    const headerList = await headers();
    const pathname = headerList.get("x-pathname") || "";
    const tenantSlug = headerList.get("x-tenant-slug");

    const isJfdaRoute = pathname.startsWith("/jfda");
    const isAdministrativeRoute =
        pathname.startsWith("/auditor") ||
        pathname.startsWith("/jfda") ||
        pathname.startsWith("/auth");

    const isLandingPage = !tenantSlug && pathname === "/";

    // 🔧 FIXED: Server-side validation - check if we're on a tenant subdomain but tenant doesn't exist
    // This prevents people from accessing invalid subdomains
    if (tenantSlug && !tenant && !isAdministrativeRoute) {
        console.error(`❌ Tenant slug "${tenantSlug}" was injected by middleware but not found in database`);
        return notFound();
    }

    return (
        <html lang="en">
        <body className="min-h-screen bg-neutral-100 font-mono antialiased text-black">
        <AuthProvider>
            {isLandingPage && (
                <main>{children}</main>
            )}

        {tenant && !isAdministrativeRoute ? (
            // ── Tenant (owner) layout ──
            <div className="flex flex-col min-h-screen">
                <header className="border-b-4 border-black bg-yellow-400 p-4 flex justify-between items-center rounded-none">
                    <div className="flex items-center gap-3">
                        <span className="bg-black text-white px-2 py-0.5 text-xs font-bold uppercase rounded-none">
                            Tenant Portal
                        </span>
                        <span className="font-extrabold uppercase text-sm tracking-tight">
                            {tenant.business_name}
                        </span>
                    </div>
                    <LogoutButton />
                    <div className="flex items-center gap-2 text-xs font-bold">
                        <span className="border border-black px-1.5 py-0.5 bg-white uppercase">
                            Level {tenant.cert_level.replace("LEVEL_", "")}
                        </span>
                        <span className="border border-black px-1.5 py-0.5 bg-black text-white uppercase">
                            {tenant.cert_status}
                        </span>
                    </div>
                </header>
                <main className="flex-grow">{children}</main>
            </div>
        ) : (
            // ── Administrative (non‑tenant) layout ──
            <>
                {isJfdaRoute && (
                    <header className="border-b-4 border-black bg-red-600 p-4 flex justify-between items-center rounded-none">
                        <div className="flex items-center gap-3">
                            <span className="bg-white text-black px-2 py-0.5 text-xs font-bold uppercase rounded-none">
                                Gov Portal
                            </span>
                            <span className="font-extrabold uppercase text-sm tracking-tight text-white">
                                JFDA Compliance Registry
                            </span>
                        </div>
                        {/* Optional: add JFDA‑specific logout or actions */}
                        <LogoutButton />
                    </header>
                )}
                <main className="min-h-screen">{children}</main>
            </>
        )}
        </AuthProvider>
        </body>
        </html>
    );
}