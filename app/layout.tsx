// src/app/layout.tsx
import React from "react";
import AuthProvider from "@/lib/utils/AuthProvider";
import localFont from "next/font/local";
import { Noto_Sans_Arabic } from "next/font/google";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "next-themes";
import { I18nProvider } from "@/components/providers/i18nProvider";
import "@/app/global.css";

export const metadata = {
    icons: { icon: "/favicon.ico" },
};

// ─── Century Gothic ──────────────────────────────────────
const centuryGothic = localFont({
    src: [
        {
            path: "../font/CenturyGothicPaneuropeanRegular.ttf",
            weight: "400",
            style: "normal",
        },
        {
            path: "../font/CenturyGothicPaneuropeanBold.ttf",
            weight: "700",
            style: "normal",
        },
    ],
    variable: "--font-century",
    display: "swap",
});

// ─── Arabic font ──────────────────────────────────────────
const notoSansArabic = Noto_Sans_Arabic({
    subsets: ["arabic"],
    variable: "--font-arabic",
    weight: ["400", "700"],
    display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html
            lang="en"
            suppressHydrationWarning
            className={cn(
                centuryGothic.variable,
                notoSansArabic.variable,
                "min-h-screen"
            )}
            style={
                {
                    "--font-sans": "var(--font-century)",
                    "--font-heading": "var(--font-century)",
                } as React.CSSProperties
            }
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
            <I18nProvider>
                <AuthProvider>
                    <main>{children}</main>
                </AuthProvider>
            </I18nProvider>
        </ThemeProvider>
        </body>
        </html>
    );
}