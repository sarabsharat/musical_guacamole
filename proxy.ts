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
    "/error"
];

const ONBOARDING_PATHS = ["/onboarding", "/denier"];

export async function proxy(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    const hostname = request.headers.get("host") || "";

    // ─── Host Detection ──────────────────────────────────────
    const parts = hostname.split(":");
    const hostWithoutPort = parts[0];
    const port = parts[1] || "";

    let subdomain: string | null = null;
    let rootDomain = "local.bsharat.me"; // Default local base

    if (process.env.NODE_ENV === "production") {
        // Change this string to your exact production root domain (e.g., "musical-guacamole.jo")
        const prodRoot = "musical-guacamole.jo";
        rootDomain = prodRoot;

        if (hostWithoutPort !== prodRoot && hostWithoutPort.endsWith(`.${prodRoot}`)) {
            subdomain = hostWithoutPort.replace(`.${prodRoot}`, "");
        }
    } else {
        // Local environment handling
        if (hostWithoutPort === "localhost") {
            rootDomain = "localhost";
        } else if (hostWithoutPort !== "local.bsharat.me" && hostWithoutPort.endsWith(".local.bsharat.me")) {
            subdomain = hostWithoutPort.replace(".local.bsharat.me", "");
        }
    }

    const baseUrl = port ? `${rootDomain}:${port}` : rootDomain;

    console.log("🌐 [Proxy] Host Detection:");
    console.log(`   hostname: ${hostname}`);
    console.log(`   rootDomain: ${rootDomain}`);
    console.log(`   subdomain: ${subdomain || "null"}`);
    console.log(`   pathname: ${pathname}`);

    // 🚨 REMOVED: Subdomain Login Trapdoor.
    // We now explicitly allow users to visit slug.domain.com/login!

    // ─── Session ────────────────────────────────────────────
    const session = await auth();
    const isOwner = session?.user?.role === "restaurant_owner";

    // ─── Case 0: Authenticated but no role (new Google) ───
    if (session && !session.user?.role) {
        if (pathname === "/signup") return NextResponse.next();
        return NextResponse.redirect(new URL(`http://${baseUrl}/signup`));
    }

    // ─── Case 0.5: Redirect authenticated users away from public pages ──
    if (session) {
        const publicRedirectPaths = ["/", "/login", "/signup", "/signup/owner", "/signup/jfda", "/signup/auditor", "/forgot-password", "/dashboard"];

        if (publicRedirectPaths.includes(pathname)) {
            if (isOwner && session.user?.slug) {

                // 🚨 STRICT LOGIN CHECK: If they log in on a subdomain, it MUST match their account slug.
                if (subdomain && subdomain !== session.user.slug) {
                    console.log(`🚫 [Proxy] Mismatch! User belongs to ${session.user.slug} but logged in on ${subdomain}`);
                    // Reject the login attempt and send them to an error page
                    return NextResponse.redirect(new URL(`http://${baseUrl}/error?message=Unauthorized+Tenant+Access`));
                }

                // If the slug matches (or they logged in on the main domain), send to their dashboard
                const subdomainUrl = `http://${session.user.slug}.${baseUrl}/owner/dashboard`;
                console.log(`🔄 [Proxy] Redirecting owner from ${pathname} to subdomain dashboard`);
                return NextResponse.redirect(subdomainUrl);

            } else if (isOwner && !session.user?.slug) {
                return NextResponse.redirect(new URL(`http://${baseUrl}/onboarding`));
            } else if (!isOwner) {
                let dashboardPath = "/dashboard";
                if (session.user?.role === "jfda_officer") dashboardPath = "/jfda/dashboard";
                else if (session.user?.role === "nutritionist_auditor") dashboardPath = "/auditor/dashboard";
                else if (session.user?.role === "platform_admin") dashboardPath = "/admin/dashboard";
                return NextResponse.redirect(new URL(`http://${baseUrl}${dashboardPath}`));
            }
        }
    }

    // ─── Case 1: NOT AUTHENTICATED ──────────────────────────
    if (!session) {
        if (PUBLIC_PATHS.includes(pathname)) {
            return NextResponse.next();
        }

        // 🚨 KEEPS THEM ON THE SUBDOMAIN: Now, if they try to access a protected page
        // on a subdomain, we send them to the login page OF THAT subdomain.
        const currentDomain = subdomain ? `${subdomain}.${baseUrl}` : baseUrl;
        const loginUrl = new URL(`http://${currentDomain}/login`);

        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // ─── Case 2: AUTHENTICATED NON-OWNER ────────────────────
    if (session && !isOwner) {
        const role = session.user.role;
        let allowedPaths: string[] = [];

        if (role === "jfda_officer") {
            allowedPaths = ["/jfda/dashboard", "/jfda/restaurants"];
        }
        else if (role === "nutritionist_auditor") {
            allowedPaths = ["/auditor/dashboard"];
        }
        else if (role === "platform_admin") {
            allowedPaths = ["/admin/dashboard"];
        }
        else {
            allowedPaths = ["/dashboard"];
        }

        const sharedPaths = ["/profile", "/settings"];
        const isExactMatch = allowedPaths.includes(pathname) || sharedPaths.includes(pathname);

        // 🚨 2. Allow dynamic paths like /restaurants/123
        const isDynamicMatch = role === "jfda_officer" && pathname.startsWith("/jfda/restaurants/");

        if (!subdomain && (isExactMatch || isDynamicMatch)) {
            return NextResponse.next();
        }

        const targetPath = allowedPaths[0] || "/dashboard";
        return NextResponse.redirect(new URL(`http://${baseUrl}${targetPath}`));
    }

    // ─── Case 3: AUTHENTICATED OWNER – NO SLUG ──────────────
    if (session && isOwner && !session.user.slug) {
        if (ONBOARDING_PATHS.includes(pathname) || PUBLIC_PATHS.includes(pathname)) {
            return NextResponse.next();
        }
        return NextResponse.redirect(new URL(`http://${baseUrl}/onboarding`));
    }

    // ─── Case 4: AUTHENTICATED OWNER – MAIN DOMAIN ──────────
    if (session && isOwner && session.user.slug && !subdomain) {
        if (hostname.startsWith(`${session.user.slug}.`)) {
            return NextResponse.next();
        }
        if (PUBLIC_PATHS.includes(pathname)) {
            return NextResponse.next();
        }
        let targetPath = pathname === "/dashboard" ? "/owner/dashboard" : pathname;
        const subdomainUrl = `http://${session.user.slug}.${baseUrl}${targetPath}`;
        return NextResponse.redirect(subdomainUrl);
    }

    // ─── Case 5: AUTHENTICATED OWNER – CORRECT SUBDOMAIN ────
    if (session && isOwner && session.user.slug && subdomain === session.user.slug) {
        if (PUBLIC_PATHS.includes(pathname)) {
            return NextResponse.next();
        }
        if (pathname === "/dashboard") {
            return NextResponse.redirect(new URL(`http://${subdomain}.${baseUrl}/owner/dashboard`));
        }
        return NextResponse.next();
    }

    // ─── Case 6: AUTHENTICATED OWNER – WRONG SUBDOMAIN ──────
    if (session && isOwner && session.user.slug && subdomain && subdomain !== session.user.slug) {
        // If they try navigating directly to another restaurant's dashboard URL,
        // silently correct them back to their own subdomain.
        const correctUrl = `http://${session.user.slug}.${baseUrl}${pathname}`;
        return NextResponse.redirect(correctUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|locales|logos|acct-logo-horizontal.png|.well-known|_next/webpack-hmr).*)",
    ],
};