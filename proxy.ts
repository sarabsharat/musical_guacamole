// proxy.ts (project root)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

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
];

const ONBOARDING_PATHS = ["/onboarding", "/denier"];

export async function proxy(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    const hostname = request.headers.get("host") || "";

    // ─── Host Detection ──────────────────────────────────────
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

    // ─── Subdomain Login Trapdoor ──────────────────────────
    if (pathname === "/login" && subdomain) {
        console.log(`🔄 [Proxy] Booting subdomain login back to main domain`);
        return NextResponse.redirect(new URL(`http://${baseUrl}/login`));
    }

    // ─── Session ────────────────────────────────────────────
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

    // ─── Case 0: Authenticated but no role (new Google) ───
    if (session && !session.user?.role) {
        console.log("📍 [Proxy] Route: AUTHENTICATED_NO_ROLE");
        if (pathname === "/signup") return NextResponse.next();
        return NextResponse.redirect(new URL(`http://${baseUrl}/signup`));
    }

    // ─── Case 0.5: Redirect authenticated users away from public pages ──
    if (session) {
        // Include /dashboard here so all authenticated users are caught
        const publicRedirectPaths = ["/", "/login", "/signup", "/signup/owner", "/signup/jfda", "/signup/auditor", "/forgot-password", "/dashboard"];
        if (publicRedirectPaths.includes(pathname)) {
            const isOwner = session.user?.role === "restaurant_owner";
            if (isOwner && session.user?.slug) {
                const subdomainUrl = `http://${session.user.slug}.${baseUrl}/owner/dashboard`;
                console.log(`🔄 [Proxy] Redirecting owner from ${pathname} to subdomain dashboard`);
                return NextResponse.redirect(subdomainUrl);
            } else if (isOwner && !session.user?.slug) {
                console.log(`🔄 [Proxy] Redirecting owner (no slug) to onboarding`);
                return NextResponse.redirect(new URL(`http://${baseUrl}/onboarding`));
            } else if (!isOwner) {
                let dashboardPath = "/dashboard";
                if (session.user?.role === "jfda_officer") dashboardPath = "/jfda/dashboard";
                else if (session.user?.role === "nutritionist_auditor") dashboardPath = "/auditor/dashboard";
                else if (session.user?.role === "platform_admin") dashboardPath = "/admin/dashboard";
                console.log(`🔄 [Proxy] Redirecting non-owner from ${pathname} to ${dashboardPath}`);
                return NextResponse.redirect(new URL(`http://${baseUrl}${dashboardPath}`));
            }
        }
    }

    // ─── Case 1: NOT AUTHENTICATED ──────────────────────────
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

    // ─── Case 2: AUTHENTICATED NON-OWNER ────────────────────
    // This case now only allows access to the specific dashboard of that role.
    // If the user hits any other path, they are redirected to their dashboard.
    if (session && !isOwner) {
        console.log("📍 [Proxy] Route: AUTHENTICATED_NON_OWNER");
        const role = session.user.role;
        let allowedPaths: string[] = [];
        if (role === "jfda_officer") allowedPaths = ["/jfda/dashboard"];
        else if (role === "nutritionist_auditor") allowedPaths = ["/auditor/dashboard"];
        else if (role === "platform_admin") allowedPaths = ["/admin/dashboard"];
        else allowedPaths = ["/dashboard"]; // fallback

        if (!subdomain && allowedPaths.includes(pathname)) {
            console.log(`✅ [Proxy] Allow non-owner access to: ${pathname}`);
            return NextResponse.next();
        }

        // Redirect to their role dashboard
        const targetPath = allowedPaths[0] || "/dashboard";
        console.log(`🔄 [Proxy] Redirecting non-owner to ${targetPath}`);
        return NextResponse.redirect(new URL(`http://${baseUrl}${targetPath}`));
    }

    // ─── Case 3: AUTHENTICATED OWNER – NO SLUG ──────────────
    if (session && isOwner && !session.user.slug) {
        console.log("📍 [Proxy] Route: AUTHENTICATED_OWNER_NO_SLUG");
        if (ONBOARDING_PATHS.includes(pathname) || PUBLIC_PATHS.includes(pathname)) {
            console.log(`✅ [Proxy] Allow onboarding path: ${pathname}`);
            return NextResponse.next();
        }
        console.log(`🚫 [Proxy] Redirect to onboarding (no slug)`);
        return NextResponse.redirect(new URL(`http://${baseUrl}/onboarding`));
    }

    // ─── Case 4: AUTHENTICATED OWNER – MAIN DOMAIN ──────────
    if (session && isOwner && session.user.slug && !subdomain) {
        if (hostname.startsWith(`${session.user.slug}.`)) {
            return NextResponse.next();
        }
        console.log("📍 [Proxy] Route: AUTHENTICATED_OWNER_MAIN_DOMAIN");
        if (PUBLIC_PATHS.includes(pathname)) {
            return NextResponse.next();
        }
        let targetPath = pathname === "/dashboard" ? "/owner/dashboard" : pathname;
        const subdomainUrl = `http://${session.user.slug}.${baseUrl}${targetPath}`;
        console.log(`🔄 [Proxy] Redirect to subdomain: ${subdomainUrl}`);
        return NextResponse.redirect(subdomainUrl);
    }

    // ─── Case 5: AUTHENTICATED OWNER – CORRECT SUBDOMAIN ────
    if (session && isOwner && session.user.slug && subdomain === session.user.slug) {
        console.log("📍 [Proxy] Route: AUTHENTICATED_OWNER_CORRECT_SUBDOMAIN");
        if (PUBLIC_PATHS.includes(pathname)) {
            console.log(`✅ [Proxy] Allow public path on subdomain: ${pathname}`);
            return NextResponse.next();
        }
        if (pathname === "/dashboard") {
            console.log(`🔄 [Proxy] Redirecting ${pathname} to /owner/dashboard`);
            return NextResponse.redirect(new URL(`http://${subdomain}.${baseUrl}/owner/dashboard`));
        }
        console.log(`✅ [Proxy] Allow access to restaurant dashboard`);
        return NextResponse.next();
    }

    // ─── Case 6: AUTHENTICATED OWNER – WRONG SUBDOMAIN ──────
    if (session && isOwner && session.user.slug && subdomain && subdomain !== session.user.slug) {
        console.log("📍 [Proxy] Route: AUTHENTICATED_OWNER_WRONG_SUBDOMAIN");
        const correctUrl = `http://${session.user.slug}.${baseUrl}${pathname}`;
        console.log(`🔄 [Proxy] Redirect to correct subdomain: ${correctUrl}`);
        return NextResponse.redirect(correctUrl);
    }

    console.log("✅ [Proxy] Allow (default)");
    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|locales|logos|acct-logo-horizontal.png|.well-known|_next/webpack-hmr).*)",
    ],
};