// src/app/auth/login/page.tsx - FIXED VERSION
"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

/**
 * Helper to construct the redirect URL dynamically based on hostname
 * Supports both localhost subdomains and production domains
 */
function getRedirectUrl(slug: string, hostname: string, path: string = "/submit"): string {
    try {
        const url = new URL(window.location.href);

        // Get current protocol
        const protocol = url.protocol; // "http:" or "https:"

        if (hostname.includes("localhost")) {
            // Local development: slug.localhost:3000/path
            const port = url.port ? `:${url.port}` : "";
            return `${protocol}//${slug}.localhost${port}${path}`;
        } else {
            // Production: slug.yourapp.jo/path or custom domain
            // Extract root domain (e.g., "musical-guacamole.jo" from "leen-dumplings.musical-guacamole.jo")
            const parts = hostname.split(".");

            // If more than 2 parts, it's a subdomain - reconstruct with slug
            if (parts.length > 2) {
                // Remove the current slug if present
                const rootDomain = parts.slice(1).join(".");
                return `${protocol}//${slug}.${rootDomain}${path}`;
            } else {
                // Root domain - just add slug
                return `${protocol}//${slug}.${hostname}${path}`;
            }
        }
    } catch (error) {
        console.error("Error constructing redirect URL:", error);
        // Fallback to /dashboard on same host
        return `${path}`;
    }
}

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError("Invalid email or password. Verify your seed credentials.");
            } else {
                // 🔧 FIXED: Fetch session and construct dynamic redirect URL
                const sessionRes = await fetch("/api/auth/session");
                const session = await sessionRes.json();

                if (session?.user?.slug) {
                    // Get current hostname to support both localhost and production
                    const hostname = window.location.hostname;
                    const redirectUrl = getRedirectUrl(session.user.slug, hostname, "/submit");

                    console.log("🟢 Redirecting to:", redirectUrl);
                    window.location.href = redirectUrl;
                } else {
                    // Fallback for non-owner users
                    window.location.href = "/dashboard";
                }
            }
        } catch (err: any) {
            setError("Authentication connection failure.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div >
            <form
                onSubmit={handleSubmit}

            >
                <div >
                    <span >
                        SECURE CONTROL PANEL
                    </span>
                    <h1 >Sign In</h1>
                </div>

                {error && (
                    <div >
                        {error}
                    </div>
                )}

                <div >
                    <label >Email Address</label>
                    <input
                        required
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="leen@dumplings.com"
                    />
                </div>

                <div className="space-y-1">
                    <label >Password</label>
                    <input
                        required
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••"
                     />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                >
                    {loading ? "Authenticating..." : "Establish Secure Session"}
                </button>
            </form>
        </div>
    );
}