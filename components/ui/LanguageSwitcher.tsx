"use client";

import { useTranslation } from "react-i18next";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
    const { i18n } = useTranslation();

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
        document.documentElement.lang = lng;
        document.documentElement.dir = lng === "ar" ? "rtl" : "ltr";
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-primary hover:text-secondary-foreground h-10 w-10"
            >
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
    );
}