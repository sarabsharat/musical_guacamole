// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
    const url = req.nextUrl;
    const hostname = req.headers.get("host") || "";

    const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";

    // 1. Bypass Next.js internals, API routes, and static assets
    if (
        hostname === ROOT_DOMAIN ||
        url.pathname.startsWith("/api") ||
        url.pathname.startsWith("/_next") ||
        url.pathname.includes(".")
    ) {
        return NextResponse.next();
    }

    // 2. Extract subdomain: 'auditor.localhost:3000' -> 'auditor'
    const subdomain = hostname.replace(`.${ROOT_DOMAIN}`, "");

    // 3. LAYER: Auditor Portal
    if (subdomain === "auditor") {
        if (!url.pathname.startsWith("/auditor")) {
            url.pathname = `/auditor${url.pathname}`;
        }
        return NextResponse.rewrite(url);
    }

    // 4. LAYER: JFDA Portal
    if (subdomain === "jfda") {
        if (!url.pathname.startsWith("/jfda")) {
            url.pathname = `/jfda${url.pathname}`;
        }
        return NextResponse.rewrite(url);
    }

    // 5. LAYER: Root Domain Fallback (e.g., standard localhost:3000)
    // Useful if you have a landing page or want them to hit /auth/login
    if (hostname === ROOT_DOMAIN || subdomain === ROOT_DOMAIN) {
        return NextResponse.next();
    }

    // 6. LAYER: Restaurant Tenants (Owner Portal)
    const protocol = req.nextUrl.protocol || (hostname.includes("localhost") ? "http:" : "https:");

    try {
        const tenantRes = await fetch(`${protocol}//${ROOT_DOMAIN}/api/tenant/${subdomain}`);

        if (!tenantRes.ok) {
            return NextResponse.rewrite(new URL("/404", req.url));
        }

        const tenant = await tenantRes.json();

        const requestHeaders = new Headers(req.headers);
        requestHeaders.set("x-tenant-id", tenant.id.toString());
        requestHeaders.set("x-tenant-slug", tenant.slug);

        // INVISIBLE REWRITE: Map clean URLs to the /owner directory
        if (!url.pathname.startsWith("/owner")) {
            url.pathname = `/owner${url.pathname}`;
        }

        return NextResponse.rewrite(url, {
            request: {
                headers: requestHeaders,
            },
        });
    } catch (error) {
        console.error("Middleware fetch error:", error);
        return NextResponse.next();
    }
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};