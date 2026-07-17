import type { NextConfig } from "next";

console.log("✅ Next.js config loaded!");

const nextConfig: NextConfig = {
    // 1. ADD THIS: This fixes the blocked WebSocket HMR error
    allowedDevOrigins: ['myapp.test'],

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

    // Note: 'webpackDevMiddleware' and 'serverRuntimeConfig' were
    // causing the errors because they aren't part of the core NextConfig type.
    // The 'allowedDevOrigins' setting above is all you need to fix the HMR block.
};

export default nextConfig;