// components/landing/RotatingLogo.tsx
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface RotatingLogoProps {
    logos: { src: string; alt: string }[];
    interval?: number; // in ms
    className?: string;
}

export function RotatingLogo({ logos, interval = 3000, className = "" }: RotatingLogoProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % logos.length);
        }, interval);
        return () => clearInterval(timer);
    }, [logos.length, interval]);

    return (
        <span className={`relative inline-flex items-center justify-center h-[1.1em] aspect-square align-middle mx-1 sm:mx-2 -translate-y-[0.1em] ${className}`}>
      {logos.map((logo, idx) => (
          <Image
              key={idx}
              src={logo.src}
              alt={logo.alt}
              fill
              className={`object-contain rounded-xl sm:rounded-2xl transition-opacity duration-700 ease-in-out ${
                  idx === currentIndex ? "opacity-100" : "opacity-0"
              }`}
          />
      ))}
    </span>
    );
}