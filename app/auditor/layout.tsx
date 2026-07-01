
// src/app/auditor/layout.tsx
import React from "react";
import { getSession, assertUserAccess } from "@/lib/security";
import { Role } from "@prisma/client";
import Link from "next/link";

interface AuditorLayoutProps {
    children: React.ReactNode;
}

export default async function AuditorLayout({ children }: AuditorLayoutProps) {
    // 1. Authenticate session context
    const session = await getSession();

    // 2. 🚨 SECURITY: Root-level guardrail for all auditor routes
    await assertUserAccess(session, [Role.nutritionist_auditor, Role.platform_admin]);

    return (
        <div className="flex flex-col min-h-screen bg-neutral-100 font-mono antialiased text-black">
            {/* Brutalist Auditor Header */}
            <header className="border-b-4 border-black bg-neutral-900 text-white p-4 flex justify-between items-center rounded-none">
                <div className="flex items-center gap-3">
          <span className="bg-red-500 text-white px-2 py-0.5 text-xs font-bold uppercase rounded-none border border-black">
            GOV AUDIT ACCESS
          </span>
                    <span className="font-extrabold uppercase text-sm tracking-tight hidden sm:inline">
            JFDA Compliance Terminal
          </span>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold">
                    <span className="text-neutral-400">Auditor: {session?.full_name}</span>
                    <Link
                        href="/auth/logout"
                        className="border-2 border-white bg-white text-black px-2.5 py-1 uppercase rounded-none hover:bg-neutral-200 transition"
                    >
                        Logout
                    </Link>
                </div>
            </header>

            <div className="flex flex-1 flex-col md:flex-row">
                {/* Sidebar Nav */}
                <aside className="w-full md:w-64 border-b-4 md:border-b-0 md:border-r-4 border-black bg-white p-4 space-y-4 rounded-none">
                    <div className="font-extrabold uppercase text-xs tracking-wider text-neutral-400">
                        Navigation Menu
                    </div>
                    <nav className="flex flex-row md:flex-col gap-2 font-bold text-xs uppercase">
                        <Link
                            href="/auditor/queue"
                            className="flex-1 md:flex-none border-2 border-black bg-neutral-50 hover:bg-black hover:text-white px-3 py-2 rounded-none transition"
                        >
                            Pending L1 Queue
                        </Link>

                        {/* REPLACED LINK WITH DIV TO AVOID SERIALIZATION ERRORS */}
                        <div
                            className="flex-1 md:flex-none border-2 border-black bg-neutral-50 px-3 py-2 rounded-none transition opacity-50 cursor-not-allowed"
                        >
                            Performance Metrics
                        </div>
                    </nav>
                </aside>

                {/* Dynamic Route Content */}
                <div className="flex-grow bg-neutral-100 p-2 sm:p-6 md:p-8">
                    {children}
                </div>
            </div>
        </div>
    );
}