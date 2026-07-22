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

const ONBOARDING_PATHS = ["/onboarding", "/onboarding/owner", "/onboarding/auditor"];

export async function proxy(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    const hostname = request.headers.get("host") || "";

    // ─── Host Detection ──────────────────────────────────────
    const parts = hostname.split(":");
    const hostWithoutPort = parts[0];
    const port = parts[1] || "";

    let subdomain: string | null = null;
    let rootDomain = "local.bsharat.me";

    if (process.env.NODE_ENV === "production") {
        const prodRoot = "musical-guacamole.jo";
        rootDomain = prodRoot;
        if (hostWithoutPort !== prodRoot && hostWithoutPort.endsWith(`.${prodRoot}`)) {
            subdomain = hostWithoutPort.replace(`.${prodRoot}`, "");
        }
    } else {
        if (hostWithoutPort === "localhost") {
            rootDomain = "localhost";
        } else if (hostWithoutPort !== "local.bsharat.me" && hostWithoutPort.endsWith(".local.bsharat.me")) {
            subdomain = hostWithoutPort.replace(".local.bsharat.me", "");
        }
    }

    const baseUrl = port ? `${rootDomain}:${port}` : rootDomain;

    // ─── Session & Role ──────────────────────────────────────
    const session = await auth();
    const role = session?.user?.role;
    const isOwner = role === "restaurant_owner";
    const isAuditor = role === "nutritionist_auditor";
    const isJFDA = role === "jfda_officer";
    const isAdmin = role === "platform_admin";
    const verificationStatus = session?.user?.verification_status;
    const slug = session?.user?.slug;

    // ─── Case 0: Authenticated but no role (Google signup) ───
    if (session && !role) {
        if (pathname === "/signup") return NextResponse.next();
        return NextResponse.redirect(new URL(`http://${baseUrl}/signup`));
    }

    // ─── Case 0.5: Redirect authenticated users away from public pages ──
    if (session) {
        const publicRedirectPaths = ["/", "/login", "/signup", "/signup/owner", "/signup/jfda", "/signup/auditor", "/forgot-password", "/dashboard"];

        if (ONBOARDING_PATHS.includes(pathname)) {
            return NextResponse.next();
        }

        if (publicRedirectPaths.includes(pathname)) {
            if (isOwner) {
                if (slug) {
                    if (subdomain && subdomain !== slug) {
                        return NextResponse.redirect(new URL(`http://${baseUrl}/error?message=Unauthorized+Tenant+Access`));
                    }
                    return NextResponse.redirect(new URL(`http://${slug}.${baseUrl}/owner/dashboard`));
                } else {
                    return NextResponse.redirect(new URL(`http://${baseUrl}/onboarding/owner`));
                }
            }

            if (isAuditor) {
                if (verificationStatus === "UNVERIFIED" || verificationStatus === "PENDING") {
                    return NextResponse.redirect(new URL(`http://${baseUrl}/onboarding/auditor`));
                }
                return NextResponse.redirect(new URL(`http://${baseUrl}/auditor/dashboard`));
            }

            if (isJFDA) {
                return NextResponse.redirect(new URL(`http://${baseUrl}/jfda/dashboard`));
            }

            if (isAdmin) {
                return NextResponse.redirect(new URL(`http://${baseUrl}/admin/dashboard`));
            }

            return NextResponse.redirect(new URL(`http://${baseUrl}/dashboard`));
        }
    }

    // ─── Case 1: NOT AUTHENTICATED ──────────────────────────
    if (!session) {
        if (PUBLIC_PATHS.includes(pathname)) {
            return NextResponse.next();
        }

        const currentDomain = subdomain ? `${subdomain}.${baseUrl}` : baseUrl;
        const loginUrl = new URL(`http://${currentDomain}/login`);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // ─── Case 2: AUTHENTICATED NON-OWNER ────────────────────
    if (session && !isOwner) {
        let allowedPaths: string[] = [];

        if (isJFDA) {
            allowedPaths = ["/jfda/dashboard", "/jfda/restaurants"];
        } else if (isAuditor) {
            allowedPaths = ["/auditor/dashboard", "/auditor/queue", "/auditor/audit", "/auditor/reports"];
        } else if (isAdmin) {
            allowedPaths = ["/admin/dashboard"];
        } else {
            allowedPaths = ["/dashboard"];
        }

        // Auditor unverified – force onboarding
        if (isAuditor && (verificationStatus === "UNVERIFIED" || verificationStatus === "PENDING")) {
            if (pathname === "/onboarding/auditor" || PUBLIC_PATHS.includes(pathname)) {
                return NextResponse.next();
            }
            return NextResponse.redirect(new URL(`http://${baseUrl}/onboarding/auditor`));
        }

        const sharedPaths = ["/profile", "/settings"];
        const isExactMatch = allowedPaths.includes(pathname) || sharedPaths.includes(pathname);

        // Allow dynamic paths for JFDA and Auditor
        const isDynamicMatch =
            (isJFDA && pathname.startsWith("/jfda/restaurants/")) ||
            (isAuditor && (pathname.startsWith("/auditor/queue/") || pathname.startsWith("/auditor/audit/")));

        if (!subdomain && (isExactMatch || isDynamicMatch)) {
            return NextResponse.next();
        }

        const targetPath = allowedPaths[0] || "/dashboard";
        return NextResponse.redirect(new URL(`http://${baseUrl}${targetPath}`));
    }

    // ─── Case 3: AUTHENTICATED OWNER – NO SLUG ──────────────
    if (session && isOwner && !slug) {
        if (pathname === "/onboarding/owner" || PUBLIC_PATHS.includes(pathname)) {
            return NextResponse.next();
        }
        return NextResponse.redirect(new URL(`http://${baseUrl}/onboarding/owner`));
    }

    // ─── Case 4: AUTHENTICATED OWNER – MAIN DOMAIN ──────────
    if (session && isOwner && slug && !subdomain) {
        if (hostname.startsWith(`${slug}.`)) {
            return NextResponse.next();
        }
        if (PUBLIC_PATHS.includes(pathname) || ONBOARDING_PATHS.includes(pathname)) {
            return NextResponse.next();
        }
        const targetPath = pathname === "/dashboard" ? "/owner/dashboard" : pathname;
        return NextResponse.redirect(new URL(`http://${slug}.${baseUrl}${targetPath}`));
    }

    // ─── Case 5: AUTHENTICATED OWNER – CORRECT SUBDOMAIN ────
    if (session && isOwner && slug && subdomain === slug) {
        if (PUBLIC_PATHS.includes(pathname) || ONBOARDING_PATHS.includes(pathname)) {
            return NextResponse.next();
        }
        if (pathname === "/dashboard") {
            return NextResponse.redirect(new URL(`http://${subdomain}.${baseUrl}/owner/dashboard`));
        }
        return NextResponse.next();
    }

    // ─── Case 6: AUTHENTICATED OWNER – WRONG SUBDOMAIN ──────
    if (session && isOwner && slug && subdomain && subdomain !== slug) {
        const correctUrl = `http://${slug}.${baseUrl}${pathname}`;
        return NextResponse.redirect(correctUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|locales|logos|acct-logo-horizontal.png|.well-known|_next/webpack-hmr).*)",
    ],
};