// src/app/layout.tsx
import React from "react";
import AuthProvider from "@/lib/utils/AuthProvider";
import localFont from "next/font/local";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "next-themes";
import { I18nProvider } from "next-i18next/client";
import "@/app/global.css";

// ─── Metadata for favicon ──────────────────────────────
export const metadata = {
    icons: {
        icon: "/favicon.ico",
    },
};

// ─── Configure Century Gothic local font ──────────────
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html
            lang="en"
            suppressHydrationWarning
            className={cn(centuryGothic.variable, "min-h-screen")}
            style={{
                "--font-sans": "var(--font-century)",
                "--font-heading": "var(--font-century)",
            } as React.CSSProperties}
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