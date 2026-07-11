"use client";

import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Moon, Sun, Globe, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/ui/logout-button";
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
    const { theme, setTheme } = useTheme();
    const { i18n } = useTranslation();

    const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
        document.documentElement.lang = lng;
        document.documentElement.dir = lng === "ar" ? "rtl" : "ltr";
    };

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
            <Link href="/owner/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
                    <Store className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
          <span className="text-sm font-semibold leading-none tracking-tight text-foreground">
            {tenant.business_name}
          </span>
                    <span className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Tenant Portal
          </span>
                </div>
            </Link>
        );
    } else {
        const label = title || role?.replace('_', ' ') || "JFDA";
        leftContent = (
            <Link href={getDashboardPath()} className="font-bold text-lg capitalize hover:opacity-80 transition-opacity">
                {label}
            </Link>
        );
    }

    const showBadges = role === Role.restaurant_owner && tenant;

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
                <div className="flex items-center gap-3">{leftContent}</div>

                <div className="flex items-center gap-2 md:gap-4">
                    {showBadges && (
                        <div className="hidden md:flex items-center gap-2">
                            <Badge variant="outline" className="font-semibold text-foreground/80">
                                Level {tenant.cert_level.replace("LEVEL_", "")}
                            </Badge>
                            <Badge
                                variant={tenant.cert_status === "ACTIVE" ? "default" : "secondary"}
                                className="font-semibold uppercase tracking-wide"
                            >
                                {tenant.cert_status}
                            </Badge>
                            <div className="hidden md:block h-5 w-px bg-border" />
                        </div>
                    )}

                    {/* Language Switcher */}
                    <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 w-10">
                            <Globe className="h-4 w-4" />
                            <span className="sr-only">Switch language</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => changeLanguage("en")}>
                                English
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => changeLanguage("ar")}>
                                العربية
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Theme Toggle */}
                    <Button variant="outline" size="icon" onClick={toggleTheme}>
                        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="sr-only">Toggle theme</span>
                    </Button>

                    {/* Logout */}
                    <LogoutButton />
                </div>
            </div>
        </header>
    );
}