"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Utensils,
    FileText,
    Sparkles,
    Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
    tenantName: string;
    role: string;
}

const navItems = [
    { name: "Dashboard", href: "/owner/dashboard", icon: LayoutDashboard },
    { name: "Recipes", href: "/owner/recipes", icon: Utensils },
    { name: "Drafts", href: "/owner/drafts", icon: FileText },
    { name: "New Recipe", href: "/owner/submit", icon: Sparkles },
    { name: "Settings", href: "/owner/settings", icon: Settings },
];

export function Sidebar({ tenantName, role }: SidebarProps) {
    const pathname = usePathname();

    return (
        <aside className="hidden md:flex md:w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground h-full min-h-screen sticky top-0 overflow-y-auto">
            {/* Tenant branding */}
            <div className="flex h-20 items-center px-6 border-b border-sidebar-border">
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-sidebar-foreground truncate">
                        {tenantName}
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/60">
                        {role}
                    </span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-6 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                                isActive
                                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                                    : "text-sidebar-foreground/70 hover:bg-secondary hover:text-secondary-foreground"
                            )}
                        >
                            <Icon className="h-5 w-5" />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="border-t border-sidebar-border p-4">
                <p className="text-[10px] font-medium text-sidebar-foreground/40 text-center">
                    {new Date().getFullYear()} Rima & Sara
                </p>
            </div>
        </aside>
    );
}