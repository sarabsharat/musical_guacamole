// src/app/auth/success/page.tsx - FIXED VERSION
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { headers } from "next/headers";

/**
 * Helper to construct the redirect URL dynamically based on request hostname
 * This runs on the server, so we use headers() instead of window.location
 */
function getRedirectUrl(slug: string, hostname: string, path: string = "/submit"): string {
    try {
        // Determine protocol from X-Forwarded-Proto header (set by proxies) or default to https in prod
        const forwardedProto = process.env.NODE_ENV === "production" ? "https" : "http";
        const protocol = forwardedProto;

        if (hostname.includes("localhost")) {
            // Local development: slug.localhost:3000/path
            // Extract port if present
            const [host, port] = hostname.split(":");
            const portStr = port ? `:${port}` : "";
            return `${protocol}://${slug}.localhost${portStr}${path}`;
        } else {
            // Production: slug.yourapp.jo/path
            // Extract root domain (everything after first dot)
            const parts = hostname.split(".");

            if (parts.length > 2) {
                // It's already a subdomain, replace first part with our slug
                const rootDomain = parts.slice(1).join(".");
                return `${protocol}://${slug}.${rootDomain}${path}`;
            } else {
                // Root domain, add slug prefix
                return `${protocol}://${slug}.${hostname}${path}`;
            }
        }
    } catch (error) {
        console.error("Error constructing redirect URL:", error);
        // Fallback
        return path;
    }
}

export default async function SuccessPage() {
    const session: any = await getServerSession(authOptions);
    if (!session) {
        redirect("/auth/login");
    }

    const role = session.user?.role;
    const slug = session.user?.slug;

    // Get hostname from headers for dynamic URL construction
    const headerList = await headers();
    const hostname = headerList.get("host") || "localhost:3000";

    // Direct owner to their dedicated tenant subdomain
    if (role === "restaurant_owner" && slug) {
        const redirectUrl = getRedirectUrl(slug, hostname, "/dashboard");
        console.log("🟢 Owner redirecting to:", redirectUrl);
        redirect(redirectUrl);
    } else if (role === "nutritionist_auditor") {
        redirect("/auditor/queue");
    } else if (role === "jfda_officer") {
        redirect("/jfda/registry");
    } else {
        redirect("/");
    }
}