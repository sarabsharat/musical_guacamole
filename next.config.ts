// next.config.ts
import type { NextConfig } from "next";

console.log("✅ Next.js config loaded!");

const nextConfig: NextConfig = {
    allowedDevOrigins: ["myapp.test", "*.myapp.test","local.bsharat.me","*.local.bsharat.me"],

    images: {
        remotePatterns: [
            {
                protocol: "http",
                hostname: "localhost",
                port: "9000",
                pathname: "/musical-guacamole/**",
            },
        ],
    },
};

export default nextConfig;