// components/landing/LandingHero.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RotatingLogo } from "./RotatingLogo";
import Image from "next/image";

const restaurantLogos = [
    { src: "/logos/1.svg", alt: "Restaurant 1" },
    { src: "/logos/2.png", alt: "Restaurant 2" },
    { src: "/logos/3.png", alt: "Restaurant 3" },
    { src: "/logos/4.png", alt: "Restaurant 4" },
    { src: "/logos/5.png", alt: "Restaurant 5" },
];

export function LandingHero() {
    return (
        <div className="relative min-h-screen overflow-hidden bg-background">

            {/* --- NEW HEADER FOR BRAND LOGO --- */}
            <header className="absolute top-0 left-0 right-0 z-50 flex items-center px-6 py-8 md:px-12 lg:px-24">
                <Link href="/" className="flex items-center">
                    <Image
                        src="/acct-logo-horizontal.png"
                        alt="ACCT Logo"
                        width={400}
                        height={120}
                        className="h-10 w-auto sm:h-12 md:h-14 object-contain"
                        priority
                    />
                </Link>
            </header>
            {/* --------------------------------- */}

            {/* Gradient background using brand primary */}
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />

            <div className="container mx-auto flex min-h-screen flex-col justify-center px-6 py-16 md:px-12 lg:px-24">
                <div className="max-w-4xl space-y-8 mt-12 sm:mt-0">
                    <div className="space-y-6">
                        <h1 className="text-4xl font-black tracking-tight sm:text-5xl md:text-6xl lg:text-7xl text-foreground leading-[1.15]">
                            Where restaurants like{" "}
                            <RotatingLogo logos={restaurantLogos} />{" "}
                            log their recipes.
                        </h1>
                    </div>

                    <p className="max-w-2xl text-base sm:text-lg md:text-xl text-muted-foreground font-medium leading-relaxed mt-6">
                        A centralized compliance and nutrition registry for Jordan&apos;s food industry.
                        Restaurant owners, auditors, and government officers all in one place.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 pt-6">
                        <Link href="/dashboard">
                            <Button size="lg" className="px-8 sm:px-10 rounded-full h-12 sm:h-14 text-base sm:text-lg font-semibold">
                                Get Started
                            </Button>
                        </Link>
                        <Link href="/about">
                            <Button variant="outline" size="lg" className="border-primary text-primary hover:bg-primary/10 px-8 sm:px-10 rounded-full h-12 sm:h-14 text-base sm:text-lg font-semibold">
                                Learn More
                            </Button>
                        </Link>
                    </div>
                </div>

                <p className="absolute bottom-8 text-xs sm:text-sm font-medium text-muted-foreground/60">
                    © {new Date().getFullYear()} Rima & Sara
                </p>
            </div>
        </div>
    );
}