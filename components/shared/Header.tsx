"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/ui/logout-button";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { Role } from "@prisma/client";

type Tenant = {
    business_name: string;
    cert_level: string;
    cert_status: string;
};

interface HeaderProps {
    role?: Role | null;
    tenant?: Tenant | null;
    title?: string;
}

export function Header({ role, tenant, title }: HeaderProps) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const { theme, setTheme } = useTheme();
    const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

    const getDashboardPath = () => {
        if (role === Role.restaurant_owner) return "/owner/dashboard";
        if (role === Role.nutritionist_auditor) return "/auditor/dashboard";
        if (role === Role.jfda_officer) return "/jfda/dashboard";
        if (role === Role.platform_admin) return "/admin/dashboard";
        return "/";
    };

    let leftContent;
    if (role === Role.restaurant_owner && tenant) {
        leftContent = (
            <Link
                href="/owner/dashboard"
                className="flex items-center gap-4 hover:opacity-80 transition-opacity"
            >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md">
                    <Store className="h-6 w-6" />
                </div>
                <div className="flex flex-col">
                    <span className="text-lg font-semibold leading-tight tracking-tight text-foreground">
                        {tenant.business_name}
                    </span>
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/80">
                        Tenant Portal
                    </span>
                </div>
            </Link>
        );
    } else {
        const label = title || role?.replace("_", " ") || "JFDA";
        leftContent = (
            <Link
                href={getDashboardPath()}
                className="text-xl font-bold capitalize hover:opacity-80 transition-opacity"
            >
                {label}
            </Link>
        );
    }

    const showBadges = role === Role.restaurant_owner && tenant;

    if (!mounted) {
        return (
            <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur shadow-sm">
                <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-8">
                    <div className="flex items-center gap-3">{leftContent}</div>
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="h-11 w-11 animate-pulse rounded-md bg-muted" />
                        <div className="h-11 w-11 animate-pulse rounded-md bg-muted" />
                        <div className="h-11 w-11 animate-pulse rounded-md bg-muted" />
                    </div>
                </div>
            </header>
        );
    }

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur shadow-sm">
            <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-8">
                <div className="flex items-center gap-3">{leftContent}</div>

                <div className="flex items-center gap-3 md:gap-4">
                    {showBadges && (
                        <div className="hidden md:flex items-center gap-3">
                            <Badge
                                variant="outline"
                                className="border-border/50 bg-background/50 px-3 py-1.5 text-sm font-semibold text-foreground/80"
                            >
                                Level {tenant.cert_level.replace("LEVEL_", "")}
                            </Badge>
                            <Badge
                                variant={tenant.cert_status === "ACTIVE" ? "default" : "secondary"}
                                className="px-3 py-1.5 text-sm font-semibold uppercase tracking-wide"
                            >
                                {tenant.cert_status}
                            </Badge>
                            <div className="hidden md:block h-6 w-px bg-border/50" />
                        </div>
                    )}

                    <LanguageSwitcher />

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={toggleTheme}
                        className="h-11 w-11 rounded-md border-border/50 bg-background/50 hover:bg-muted/50"
                    >
                        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="sr-only">Toggle theme</span>
                    </Button>

                    <LogoutButton />
                </div>
            </div>
        </header>
    );
}