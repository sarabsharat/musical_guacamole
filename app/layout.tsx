// src/app/layout.tsx
import React from "react";
import AuthProvider from "@/lib/utils/AuthProvider";
import { Outfit, DM_Sans } from "next/font/google";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "next-themes";
import { I18nProvider } from "next-i18next/client";
import "@/app/global.css";

const headingFont = Outfit({
    subsets: ["latin"],
    variable: "--font-heading",
});

const bodyFont = DM_Sans({
    subsets: ["latin"],
    variable: "--font-sans",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html
            lang="en"
            suppressHydrationWarning
            className={cn(
                "min-h-screen",
                bodyFont.variable,
                headingFont.variable
            )}
        >
        <body
            suppressHydrationWarning
            className={cn(
                "min-h-screen bg-background font-sans antialiased text-foreground"
            )}
        >
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <I18nProvider language="en">
                <AuthProvider>
                    <main>{children}</main>
                </AuthProvider>
            </I18nProvider>
        </ThemeProvider>
        </body>
        </html>
    );
}