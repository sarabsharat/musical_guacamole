// components/auth/BrandedAuthLayout.tsx
"use client"
import { ReactNode, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface BrandedAuthLayoutProps {
    children: ReactNode;
    tenant?: {
        business_name: string | null;
        logo_url: string | null;
        background_image_url: string | null;
    } | null;
    defaultName?: string;
    platformLogo?: string;
    platformLogoPosition?: "top-left" | "top-right" | "none";
    fallbackLogo?: string;
    className?: string;
    useGradient?: boolean;
}

export function BrandedAuthLayout({
                                      children,
                                      tenant,
                                      defaultName = "Rima & Sara",
                                      platformLogo = "/acct-logo-horizontal.png", // ✅ use a known good logo
                                      platformLogoPosition = "top-left",
                                      fallbackLogo,
                                      className,
                                      useGradient = true,
                                  }: BrandedAuthLayoutProps) {
    const [logoError, setLogoError] = useState(false);

    const bgStyle = tenant?.background_image_url
        ? {
            backgroundImage: `url(${tenant.background_image_url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
        }
        : {};

    const containerClasses = cn(
        "min-h-screen flex flex-col items-center justify-center p-4",
        useGradient && !tenant?.background_image_url && "bg-gradient-char-ember",
        className
    );

    // Logo priority: tenant logo → fallback → platform logo
    const mainLogo = tenant?.logo_url || fallbackLogo || platformLogo;
    const businessName = tenant?.business_name || defaultName;

    const showPlatformBadge = platformLogoPosition !== "none" && platformLogo;

    return (
        <div className={containerClasses} style={bgStyle}>
            <div className="relative bg-background/90 dark:bg-background/90 p-6 rounded-lg shadow-lg max-w-md w-full">
                {/* Platform badge */}
                {showPlatformBadge && (
                    <div
                        className={cn(
                            "absolute top-2",
                            platformLogoPosition === "top-left" ? "left-2" : "right-2"
                        )}
                    >
                        <Image
                            src={platformLogo}
                            alt="Platform logo"
                            width={32}
                            height={32}
                            className="h-8 w-auto opacity-50 hover:opacity-100 transition-opacity"
                        />
                    </div>
                )}

                {/* Main logo */}
                <div className="flex justify-center mb-2 min-h-[4rem]">
                    {!logoError && mainLogo ? (
                        <Image
                            src={mainLogo}
                            alt={businessName}
                            width={120}
                            height={60}
                            className="h-16 w-auto object-contain"
                            priority
                            unoptimized   // <-- forces direct loading, bypassing remotePatterns
                            onError={() => setLogoError(true)}
                        />
                    ) : (
                        // Fallback: show business name as text if logo fails
                        <span className="text-2xl font-bold text-primary">
              {businessName.charAt(0)}
            </span>
                    )}
                </div>

                {/* Business name */}
                <h1 className="text-center text-xl font-semibold text-foreground mb-4">
                    {businessName}
                </h1>

                {children}
            </div>
        </div>
    );
}