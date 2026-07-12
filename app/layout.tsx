// src/app/layout.tsx
import React from "react";
import AuthProvider from "@/lib/utils/AuthProvider";
import { Noto_Sans, Nunito_Sans, Playfair_Display } from "next/font/google";
import "@/app/global.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "next-themes";
import { I18nProvider } from "next-i18next/client";

const playfairDisplayHeading = Playfair_Display({subsets:['latin'],variable:'--font-heading'});
const notoSans = Noto_Sans({subsets:['latin'],variable:'--font-sans'});

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning className={cn("font-sans", notoSans.variable, playfairDisplayHeading.variable)}>
        <body className="min-h-screen bg-background   antialiased text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <I18nProvider language={"en"}>
                <AuthProvider>
                    <main>{children}</main>
                </AuthProvider>
            </I18nProvider>
        </ThemeProvider>
        </body>
        </html>
    );
}