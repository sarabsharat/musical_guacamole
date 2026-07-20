import React from "react";
import { cookies } from "next/headers"; // 👈 import
import AuthProvider from "@/lib/utils/AuthProvider";
import localFont from "next/font/local";
import { Noto_Sans_Arabic } from "next/font/google";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "next-themes";
import { I18nProvider } from "@/components/providers/i18nProvider";
import { Toaster } from "@/components/ui/sonner";
import "@/app/global.css";
import {SessionProvider} from "next-auth/react";

export const metadata = {
    icons: { icon: "/favicon.ico" },
};

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

const notoSansArabic = Noto_Sans_Arabic({
    subsets: ["arabic"],
    variable: "--font-arabic",
    weight: ["400", "700"],
    display: "swap",
});

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    // ✅ Await cookies() before using .get()
    const cookieStore = await cookies();
    const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
    const dir = locale === "ar" ? "rtl" : "ltr";

    return (
        <html
            lang={locale}
            dir={dir}
            suppressHydrationWarning
            className={cn(
                centuryGothic.variable,
                notoSansArabic.variable,
                "min-h-screen"
            )}
            // ❌ Remove inline style – let CSS handle font-family
        >
        <body
            suppressHydrationWarning
            className={cn(
                "min-h-screen bg-background font-sans antialiased text-foreground"
            )}
        >
        <SessionProvider>
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <I18nProvider>
                <AuthProvider>
                    <main>{children}</main>
                    <Toaster richColors position="top-center" />
                </AuthProvider>
            </I18nProvider>
        </ThemeProvider>
            </SessionProvider>
        </body>
        </html>
    );
}