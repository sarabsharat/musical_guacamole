// lib/auth.ts
import NextAuth, { type DefaultSession, type User } from "next-auth";
import { type JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { Role, VerificationStatus, Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { Redis } from "@upstash/redis";

// ─── Redis Client ──────────────────────────────────────────────
const redis = Redis.fromEnv();

// ─── Extend types ──────────────────────────────────────────────
declare module "next-auth" {
    interface Session {
        user: {
            id: string | number;
            role: Role | null;
            restaurantId: number | null;
            slug: string | null;
            is_active: boolean | null;
            verification_status?: VerificationStatus | string;
        } & DefaultSession["user"];
    }
    interface User {
        dbId?: number;
        role: Role | null;
        restaurantId: number | null;
        slug: string | null;
        is_active: boolean | null;
        verification_status?: VerificationStatus | string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: Role | null;
        restaurantId: number | null;
        slug: string | null;
        is_active: boolean | null;
        verification_status?: VerificationStatus | string;
        _issuedAt?: number;
        _lastInvalidationCheck?: number;
    }
}

const useSecureCookies = process.env.NODE_ENV === "production";
const cookiePrefix = useSecureCookies ? "__Secure-" : "";
const cookieDomain = useSecureCookies ? ".musical-guacamole.jo" : ".local.bsharat.me";

// ─── Auth config ───────────────────────────────────────────────
export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "owner@restaurant.com" },
                phone_number: { label: "Phone Number", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.password) return null;
                if (!credentials?.email && !credentials?.phone_number) return null;

                const where: Prisma.UserWhereInput = {
                    OR: [
                        ...(credentials.email ? [{ email: credentials.email as string }] : []),
                        ...(credentials.phone_number ? [{ phone_number: credentials.phone_number as string }] : []),
                    ],
                };

                const user = await prisma.user.findFirst({
                    where,
                    include: { restaurant: true },
                });

                if (!user || !user.password_hash) return null;

                const passwordMatch = await bcrypt.compare(
                    credentials.password as string,
                    user.password_hash
                );

                if (!passwordMatch) return null;

                return {
                    id: String(user.id),
                    dbId: user.id,
                    email: user.email,
                    name: user.full_name,
                    role: user.role,
                    restaurantId: user.restaurant?.id || null,
                    slug: user.restaurant?.slug || null,
                    is_active: user.is_active,
                    verification_status: user.verification_status,
                };
            },
        }),

        GoogleProvider({
            clientId: process.env.CLIENT_ID || "",
            clientSecret: process.env.CLIENT_SECRET || "",
            allowDangerousEmailAccountLinking: true,
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code",
                },
            },
            async profile(profile) {
                const email = profile.email;
                if (!email) throw new Error("No email provided by Google");

                let user = await prisma.user.findUnique({
                    where: { email },
                    include: { restaurant: true },
                });

                if (!user) {
                    user = await prisma.user.create({
                        data: {
                            email,
                            full_name: profile.name || "Google User",
                            role: null,
                            is_active: true,
                            image: profile.picture,
                        },
                        include: { restaurant: true },
                    });
                }

                return {
                    id: String(user.id),
                    dbId: user.id,
                    email: user.email,
                    name: user.full_name,
                    role: user.role,
                    restaurantId: user.restaurant?.id || null,
                    slug: user.restaurant?.slug || null,
                    is_active: user.is_active,
                    verification_status: user.verification_status,
                };
            },
        }),
    ],

    pages: {
        signIn: "/login",
        newUser: "/signup",
        error: "/error",
    },

    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = String(user.dbId || user.id);
                token.role = user.role;
                token.restaurantId = user.restaurantId;
                token.slug = user.slug;
                token.is_active = user.is_active;
                token.verification_status = user.verification_status;
                token._issuedAt = Date.now();
            }

            if (trigger === "update" && session) {
                token.role = session.user?.role;
                token.restaurantId = session.user?.restaurantId;
                token.slug = session.user?.slug;
                token.verification_status = session.user?.verification_status;
                token._issuedAt = Date.now();
            }
            return token;
        },

        async session({ session, token }) {
            if (session.user && token) {
                const userId = Number(token.id);

                // ✅ Try Redis cache first
                let verificationStatus = await redis.get(`user:${userId}:verification_status`);

                if (!verificationStatus) {
                    // Cache miss – fetch from DB
                    const dbUser = await prisma.user.findUnique({
                        where: { id: userId },
                        select: { verification_status: true }
                    });
                    verificationStatus = dbUser?.verification_status || token.verification_status;

                    // Cache for 60 seconds
                    await redis.set(`user:${userId}:verification_status`, verificationStatus, { ex: 60 });
                }

                session.user.id = token.id as string;
                session.user.role = token.role;
                session.user.restaurantId = token.restaurantId;
                session.user.slug = token.slug;
                session.user.is_active = token.is_active;
                session.user.verification_status = verificationStatus as string;
            }
            return session;
        },

        async signIn({ user }) {
            const headersList = await headers();
            const host = headersList.get("host") || "";
            const hostWithoutPort = host.split(":")[0];

            let subdomain: string | null = null;
            const prodRoot = "musical-guacamole.jo";
            const localRoot = "local.bsharat.me";

            if (process.env.NODE_ENV === "production") {
                if (hostWithoutPort !== prodRoot && hostWithoutPort.endsWith(`.${prodRoot}`)) {
                    subdomain = hostWithoutPort.replace(`.${prodRoot}`, "");
                }
            } else {
                if (hostWithoutPort !== localRoot && hostWithoutPort.endsWith(`.${localRoot}`)) {
                    subdomain = hostWithoutPort.replace(`.${localRoot}`, "");
                }
            }

            // Block owners from logging in on the main domain
            if (!subdomain && user.role === "restaurant_owner" && user.slug) {
                console.log(`🚫 [NextAuth] Login Aborted! Owner ${user.slug} tried to log in on the main domain.`);
                return `/login?error=MainDomainLogin`;
            }

            // Block login if subdomain doesn't match their slug
            if (subdomain && user.role === "restaurant_owner" && user.slug) {
                if (subdomain !== user.slug) {
                    console.log(`🚫 [NextAuth] Login Aborted! ${user.slug} tried logging into ${subdomain}`);
                    return `/login?error=TenantMismatch`;
                }
            }

            return true;
        },
    },

    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60,
        updateAge: 24 * 60 * 60,
    },

    cookies: {
        sessionToken: {
            name: `${cookiePrefix}authjs.session-token`,
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: useSecureCookies,
                domain: cookieDomain,
            },
        },
        callbackUrl: {
            name: `${cookiePrefix}authjs.callback-url`,
            options: {
                sameSite: "lax",
                path: "/",
                secure: useSecureCookies,
                domain: cookieDomain,
            },
        },
        csrfToken: {
            name: useSecureCookies ? `__Host-authjs.csrf-token` : `authjs.csrf-token`,
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: useSecureCookies,
            },
        },
        pkceCodeVerifier: {
            name: `${cookiePrefix}authjs.pkce.code_verifier`,
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: useSecureCookies,
                domain: cookieDomain,
            },
        },
    },

    secret: process.env.AUTH_SECRET || "fallback-secret-change-in-production",
    trustHost: true,
    debug: process.env.NODE_ENV === "development",
});

// ─── Helper ─────────────────────────────────────────────────────
export async function getServerSession() {
    const session = await auth();
    if (!session?.user) return null;

    return {
        id: session.user.id,
        email: session.user.email || "",
        name: session.user.name || "",
        role: session.user.role,
        restaurantId: session.user.restaurantId,
        slug: session.user.slug,
        is_active: session.user.is_active ?? true,
        verification_status: session.user.verification_status,
        image_url: session.user.image,
    };
}