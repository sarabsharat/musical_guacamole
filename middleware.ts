import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
    matcher: ["/((?!api/auth|_next/static|_next/image|_static|favicon.ico|robots.txt|sitemap.xml).*)"],
};

export function middleware(request: NextRequest) {
    const url = request.nextUrl.clone();
    const hostname = request.headers.get("host") || "";
    const { pathname } = url;

    // 1. Inject the request path so Server Components can inspect route scopes [4]
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", pathname);

    // 2. Resolve tenant slug
    const rootDomains = ["localhost:3000", "musical-guacamole.jo", "jfda-compliance.gov.jo"];
    let tenantSlug = "";

    const isLocalhost = hostname.includes("localhost");
    const parsedHost = hostname.split(".");

    if (isLocalhost) {
        if (parsedHost.length > 1 && parsedHost[0] !== "www") {
            tenantSlug = parsedHost[0];
        } else if (process.env.NODE_ENV === "development") {
            tenantSlug = "dev-tenant";
        }
    } else {
        const matchedRoot = rootDomains.find(d => hostname.endsWith(d));
        if (matchedRoot && hostname !== matchedRoot) tenantSlug = hostname.replace(`.${matchedRoot}`, "");
    }

    // 3. Logic: If no tenant slug is identified, pass standard routing unchanged
    if (!tenantSlug || tenantSlug === "www" || tenantSlug === "admin") {
        return NextResponse.next({ request: { headers: requestHeaders } });
    }

    // Inject secure tenant subdomain header [4]
    requestHeaders.set("x-tenant-slug", tenantSlug);

    // 4. Invisible Routing System
    const routeRewrites: Record<string, string> = {
        "/dashboard": "/owner/dashboard",
        "/submit": "/owner/submit",
        "/drafts": "/owner/drafts",
        "/recipes": "/owner/recipes",
    };

    if (routeRewrites[pathname]) {
        url.pathname = routeRewrites[pathname];
        return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }

    // Dynamic rewrite for /drafts/5 -> /owner/drafts/5 and /recipes/5 -> /owner/recipes/5
    if (pathname.match(/^\/(drafts|recipes)\/\d+$/)) {
        url.pathname = `/owner${pathname}`;
        return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
}
