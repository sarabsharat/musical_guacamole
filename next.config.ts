// next.config.ts
import type { NextConfig } from "next";

console.log("✅ Next.js config loaded!");

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "http",
                hostname: "localhost",
                port: "9000",
                pathname: "/musical-guacamole/**", // more specific
            },
        ],
    },
};

export default nextConfig;