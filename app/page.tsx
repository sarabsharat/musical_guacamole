"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const restaurantLogos = [
    { src: "/logos/1.svg", alt: "Restaurant 1" },
    { src: "/logos/2.png", alt: "Restaurant 2" },
    { src: "/logos/3.png", alt: "Restaurant 3" },
    { src: "/logos/4.png", alt: "Restaurant 4" },
    { src: "/logos/5.png", alt: "Restaurant 5" },
];

export default function LandingPage() {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % restaurantLogos.length);
        }, 3000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="relative min-h-screen overflow-hidden bg-background">
            {/* Gradient background */}
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />

            <div className="container mx-auto flex min-h-screen flex-col justify-center px-6 py-16 md:px-12 lg:px-24">
                <div className="max-w-4xl space-y-8">

                    {/* Fixed Inline Typography */}
                    <div className="space-y-6">
                        <h1 className="text-4xl font-black tracking-tight sm:text-5xl md:text-6xl lg:text-7xl text-foreground leading-[1.15]">
                            Where restaurants like{" "}

                            {/* The Logo Mask - Acting as a word inside the sentence */}
                            <span className="relative inline-flex items-center justify-center h-[1.1em] aspect-square align-middle mx-1 sm:mx-2 -translate-y-[0.1em]">
            {restaurantLogos.map((logo, idx) => (
                <img
                    key={idx}
                    src={logo.src}
                    alt={logo.alt}
                    className={`h-full w-full object-contain rounded-xl sm:rounded-2xl transition-opacity duration-700 ease-in-out absolute ${
                        idx === currentIndex ? "opacity-100" : "opacity-0"
                    }`}
                />
            ))}
        </span>{" "}

                            log their recipes.
                        </h1>
                    </div>

                    {/* Subtitle */}
                    <p className="max-w-2xl text-base sm:text-lg md:text-xl text-muted-foreground font-medium leading-relaxed mt-6">
                        A centralized compliance and nutrition registry for Jordan's food industry.
                        Restaurant owners, auditors, and government officers all in one place.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-wrap items-center gap-4 pt-6">
                        <Link href="/login">
                            <Button size="lg" className="px-8 sm:px-10 rounded-full h-12 sm:h-14 text-base sm:text-lg font-semibold">
                                Get Started
                            </Button>
                        </Link>
                        <Link href="/about">
                            <Button size="lg" variant="outline" className="px-8 sm:px-10 rounded-full h-12 sm:h-14 text-base sm:text-lg font-semibold">
                                Learn More
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Footer */}
                <p className="absolute bottom-8 text-xs sm:text-sm font-medium text-muted-foreground/60">
                    © {new Date().getFullYear()} Rima & Sara
                </p>
            </div>
        </div>
    );
}