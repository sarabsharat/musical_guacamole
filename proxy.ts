// proxy.ts (project root)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// ✅ Expanded public paths
const PUBLIC_PATHS = [
    "/",
    "/about",
    "/pricing",
    "/login",
    "/signup",
    "/signup/owner",
    "/signup/jfda",
    "/signup/auditor",
    "/forgot-password",
    // add any other public pages here
];

// Onboarding paths (accessible to authenticated users without a slug)
const ONBOARDING_PATHS = ["/onboarding", "/denier"];

export async function proxy(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    const hostname = request.headers.get("host") || "";

    // ═══════════════════════════════════════════════════════════════
    // 1. HOST DETECTION
    // ═══════════════════════════════════════════════════════════════

    const parts = hostname.split(":");
    const hostWithoutPort = parts[0];
    const port = parts[1] || "";

    const hostParts = hostWithoutPort.split(".");
    let subdomain: string | null = null;
    let rootDomain = hostWithoutPort;

    if (hostParts.includes("localhost") && hostParts.length === 2) {
        subdomain = hostParts[0];
        rootDomain = "localhost";
    } else if (hostParts.length >= 3) {
        subdomain = hostParts[0];
        rootDomain = hostParts.slice(1).join(".");
    }

    const baseUrl = port ? `${rootDomain}:${port}` : rootDomain;

    console.log("🌐 [Proxy] Host Detection:");
    console.log(`   hostname: ${hostname}`);
    console.log(`   rootDomain: ${rootDomain}`);
    console.log(`   subdomain: ${subdomain || "null"}`);
    console.log(`   baseUrl: ${baseUrl}`);
    console.log(`   pathname: ${pathname}`);

    // ═══════════════════════════════════════════════════════════════
    // 2. SESSION RETRIEVAL
    // ═══════════════════════════════════════════════════════════════

    const session = await auth();
    const isOwner = session?.user?.role === "restaurant_owner";

    console.log("🔐 [Proxy] Session Check:");
    console.log(`   authenticated: ${!!session}`);
    if (session?.user) {
        console.log(`   user: ${session.user.email}`);
        console.log(`   role: ${session.user.role}`);
        console.log(`   restaurantId: ${session.user.restaurantId || "null"}`);
        console.log(`   slug: ${session.user.slug || "null"}`);
    }

    // ═══════════════════════════════════════════════════════════════
    // 3. ROUTING LOGIC
    // ═══════════════════════════════════════════════════════════════

    // Case 1: NOT AUTHENTICATED
    if (!session) {
        console.log("📍 [Proxy] Route: NOT_AUTHENTICATED");
        if (PUBLIC_PATHS.includes(pathname)) {
            console.log(`✅ [Proxy] Allow public path: ${pathname}`);
            return NextResponse.next();
        }
        console.log(`🚫 [Proxy] Redirect to login (protected path)`);
        const loginUrl = new URL(`http://${baseUrl}/login`);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Case 2: AUTHENTICATED NON-OWNER (JFDA, Admin, Auditor)
    if (session && !isOwner) {
        console.log("📍 [Proxy] Route: AUTHENTICATED_NON_OWNER");

        const isJfda = session.user.role === "jfda_officer";
        const isAuditor = session.user.role === "nutritionist_auditor";
        const isAdmin = session.user.role === "platform_admin";

        const allowedPaths = [
            "/dashboard",
            isJfda ? "/jfda/dashboard" : "",
            isAuditor ? "/auditor/dashboard" : "",
            isAdmin ? "/admin/dashboard" : "",
        ].filter(Boolean);

        if (!subdomain && allowedPaths.includes(pathname)) {
            console.log(`✅ [Proxy] Allow non-owner access to: ${pathname}`);
            return NextResponse.next();
        }

        if (subdomain || !allowedPaths.includes(pathname)) {
            console.log(`🔄 [Proxy] Redirecting non-owner to main domain`);
            return NextResponse.redirect(new URL(`http://${baseUrl}/dashboard`));
        }
    }

    // Case 3: AUTHENTICATED OWNER - No slug yet (incomplete onboarding)
    if (session && isOwner && !session.user.slug) {
        console.log("📍 [Proxy] Route: AUTHENTICATED_OWNER_NO_SLUG");
        if (ONBOARDING_PATHS.includes(pathname) || PUBLIC_PATHS.includes(pathname)) {
            console.log(`✅ [Proxy] Allow onboarding path: ${pathname}`);
            return NextResponse.next();
        }
        console.log(`🚫 [Proxy] Redirect to onboarding (no slug)`);
        return NextResponse.redirect(new URL(`http://${baseUrl}/onboarding`));
    }

    // Case 4: AUTHENTICATED OWNER - Has slug, on main domain
    if (session && isOwner && session.user.slug && !subdomain) {
        console.log("📍 [Proxy] Route: AUTHENTICATED_OWNER_MAIN_DOMAIN");

        // ✅ Allow public paths to stay on main domain
        if (PUBLIC_PATHS.includes(pathname)) {
            console.log(`✅ [Proxy] Allow public path on main domain: ${pathname}`);
            return NextResponse.next();
        }

        // For protected paths (like /dashboard), redirect to subdomain
        let targetPath = pathname;
        if (pathname === "/dashboard") {
            targetPath = "/owner/dashboard";
        }

        const subdomainUrl = `http://${session.user.slug}.${baseUrl}${targetPath}`;
        console.log(`🔄 [Proxy] Redirect to subdomain: ${subdomainUrl}`);
        return NextResponse.redirect(subdomainUrl);
    }

    // Case 5: AUTHENTICATED OWNER - Has slug, on correct subdomain
    if (session && isOwner && session.user.slug && subdomain === session.user.slug) {
        console.log("📍 [Proxy] Route: AUTHENTICATED_OWNER_CORRECT_SUBDOMAIN");

        // ✅ Allow public paths on subdomain too (if they want)
        if (PUBLIC_PATHS.includes(pathname)) {
            console.log(`✅ [Proxy] Allow public path on subdomain: ${pathname}`);
            return NextResponse.next();
        }

        // Redirect /dashboard to /owner/dashboard
        if (pathname === "/dashboard") {
            console.log(`🔄 [Proxy] Redirecting ${pathname} to /owner/dashboard`);
            return NextResponse.redirect(new URL(`http://${subdomain}.${baseUrl}/owner/dashboard`));
        }

        console.log(`✅ [Proxy] Allow access to restaurant dashboard`);
        return NextResponse.next();
    }

    // Case 6: AUTHENTICATED OWNER - Has slug, on wrong subdomain
    if (session && isOwner && session.user.slug && subdomain && subdomain !== session.user.slug) {
        console.log("📍 [Proxy] Route: AUTHENTICATED_OWNER_WRONG_SUBDOMAIN");
        const correctUrl = `http://${session.user.slug}.${baseUrl}${pathname}`;
        console.log(`🔄 [Proxy] Redirect to correct subdomain: ${correctUrl}`);
        return NextResponse.redirect(correctUrl);
    }

    console.log("✅ [Proxy] Allow (default)");
    return NextResponse.next();
}

// ═══════════════════════════════════════════════════════════════════
// MATCHER CONFIG
// ═══════════════════════════════════════════════════════════════════

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|locales|logos|acct-logo-horizontal.png).*)",
    ],
};