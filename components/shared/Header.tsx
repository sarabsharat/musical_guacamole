"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Moon, Sun, Store, BellRing, Globe } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import LanguageDropdown from "@/components/ui/dropdown-language";
import ProfileDropdown from "@/components/ui/dropdown-profile";
import { NotificationDropdown } from "@/components/ui/notification-dropdown";

type Tenant = {
    business_name: string;
    cert_level: string;
    cert_status: string;
    logo_url?: string | null; // 👈 added
};

type User = {
    name?: string | null;
    email?: string | null;
    image?: string | null;
};

type NotificationItem = {
    id: number | string;
    textColor: string;
    title: string;
    desc: string;
    time: string;
    status: string;
};

interface HeaderProps {
    role?: Role | null;
    tenant?: Tenant | null;
    title?: string;
    user?: User | null;
    notifications?: NotificationItem[];
    readIds?: number[];
}

export function Header({ role, tenant, title, user, notifications = [], readIds = [] }: HeaderProps) {
    const [mounted, setMounted] = useState(false);
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

    // ─── Compute left content ──────────────────────────────────────
    let leftContent;
    if (role === Role.restaurant_owner && tenant) {
        const logo = tenant.logo_url;
        leftContent = (
            <Link href="/owner/dashboard" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg  text-primary-foreground shadow-md overflow-hidden">
                    {logo ? (
                        <img src={logo} alt={tenant.business_name} className="h-full w-full object-cover" />
                    ) : (
                        <Store className="h-5 w-5" />
                    )}
                </div>
                <div className="flex flex-col">
                    <span className="text-base font-semibold leading-tight tracking-tight text-foreground">
                        {tenant.business_name}
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
                        Tenant Portal
                    </span>
                </div>
            </Link>
        );
    } else {
        const label = title || role?.replace("_", " ") || "JFDA";
        leftContent = (
            <Link href={getDashboardPath()} className="text-xl font-bold capitalize hover:opacity-80 transition-opacity">
                {label}
            </Link>
        );
    }

    // ─── Show badges for owner ─────────────────────────────────────
    const showBadges = role === Role.restaurant_owner && !!tenant;

    // ─── User avatar trigger ──────────────────────────────────────
    const userAvatar = user?.image || "/avatars/default.jpg";
    const userInitials = user?.name
        ? user.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
        : "-";

    // ─── Skeleton ──────────────────────────────────────────────────
    if (!mounted) {
        return (
            <header className="bg-card sticky top-0 z-50 border-b">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:px-6">
                    <div className="flex items-center gap-4">
                        <div className="h-11 w-11 animate-pulse rounded-md bg-muted" />
                        <div className="h-5 w-32 animate-pulse rounded-md bg-muted" />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
                        <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
                        <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
                    </div>
                </div>
            </header>
        );
    }

    // ─── Full header ──────────────────────────────────────────────
    return (
        <header className="bg-card sticky top-0 z-50 border-b">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:px-6">
                {/* Left side */}
                <div className="flex items-center gap-4">
                    {leftContent}
                    {showBadges && (
                        <>
                            <Separator orientation="vertical" className="h-8" />
                            <div className="hidden md:flex items-center gap-3">
                                <Badge
                                    variant="outline"
                                    className="border-border/50 bg-background/50 px-3 py-1.5 text-sm font-semibold text-foreground/80"
                                >
                                    Level {tenant!.cert_level.replace("LEVEL_", "")}
                                </Badge>
                                <Badge
                                    variant={tenant!.cert_status === "ACTIVE" ? "default" : "secondary"}
                                    className="px-3 py-1.5 text-sm font-semibold uppercase tracking-wide"
                                >
                                    {tenant!.cert_status}
                                </Badge>
                            </div>
                        </>
                    )}
                </div>

                {/* Right side */}
                <div className="flex items-center gap-2.5">
                    <NotificationDropdown
                        defaultOpen={false}
                        align="center"
                        notifications={notifications}
                        readIds={readIds}
                        trigger={
                            <div className="rounded-full p-2 hover:bg-accent relative cursor-pointer">
                                <BellRing className="size-4" />
                            </div>
                        }
                    />

                    <LanguageDropdown
                        trigger={
                            <div className="rounded-full hover:bg-accent/80 cursor-pointer p-2">
                                <Globe size={16} />
                            </div>
                        }
                    />

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleTheme}
                        className="rounded-full p-2 hover:bg-accent h-9 w-9 cursor-pointer"
                    >
                        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="sr-only">Toggle theme</span>
                    </Button>

                    <ProfileDropdown
                        user={user ? { name: user.name, email: user.email, avatar: user.image } : null}
                        trigger={
                            <div className="rounded-full cursor-pointer">
                                <Avatar className="size-7 rounded-full">
                                    <AvatarImage src={userAvatar} alt={user?.name || "User"} />
                                    <AvatarFallback>{userInitials}</AvatarFallback>
                                </Avatar>
                            </div>
                        }
                    />
                </div>
            </div>
        </header>
    );
}