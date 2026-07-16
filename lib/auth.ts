// lib/auth.ts - Phase 2: Complete Auth.js v5 with Credentials + Google
import NextAuth, { type DefaultSession, type User } from "next-auth";
import { type JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

// ═══════════════════════════════════════════════════════════════
// 1. EXTEND TYPES (unchanged)
// ═══════════════════════════════════════════════════════════════

declare module "next-auth" {
    interface Session {
        user: {
            id: string | number;
            role: Role | null;
            restaurantId: number | null;
            slug: string | null;
            is_active: boolean | null;
        } & DefaultSession["user"];
    }
    interface User {
        role: Role | null;
        restaurantId: number | null;
        slug: string | null;
        is_active: boolean | null;
        isNewUser: boolean ;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: Role | null;
        restaurantId: number | null;
        slug: string | null;
        is_active: boolean | null;
    }
}

// ═══════════════════════════════════════════════════════════════
// 2. INITIALIZE AUTH.JS V5
// ═══════════════════════════════════════════════════════════════

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        // ─── Email/Password Provider ──────────────────────────────
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "owner@restaurant.com" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;
                const user = await prisma.user.findUnique({
                    where: { email: credentials.email as string },
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
                    email: user.email,
                    name: user.full_name,
                    role: user.role,
                    restaurantId: user.restaurant?.id || null,
                    slug: user.restaurant?.slug || null,
                    is_active: user.is_active,
                    isNewUser: false,
                };
            },
        }),

        // ─── Google OAuth Provider ──────────────────────────────────
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

                let isNewUser = false; // <-- Initialize the flag

                // ✅ NEW USER: create with default role = restaurant_owner
                if (!user) {
                    console.log("🆕 [Google] Creating new user from Google:", email);
                    isNewUser = true; // <-- Flag them as new
                    user = await prisma.user.create({
                        data: {
                            email,
                            full_name: profile.name || "Google User",
                            role: Role.null,
                            is_active: true,
                            image: profile.picture,
                        },
                        include: { restaurant: true },
                    });
                }

                return {
                    id: String(user.id),
                    email: user.email,
                    name: user.full_name,
                    role: user.role,
                    restaurantId: user.restaurant?.id || null,
                    slug: user.restaurant?.slug || null,
                    is_active: user.is_active,
                    image: user.image || profile.picture,
                    isNewUser, // <-- Pass the flag down to the callbacks
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
        // ─── JWT Callback ──────────────────────────────────────────
        async jwt({ token, user, trigger, session }) {
            // 1. Initial sign-in (runs ONLY once when logging in)
            if (user) {
                token.id = user.id as string;
                token.role = user.role;
                token.restaurantId = user.restaurantId;
                token.slug = user.slug;
                token.is_active = user.is_active;
            }

            // 2. Client-side updates (e.g., when they finish onboarding)
            if (trigger === "update" && session) {
                token.role = session.user?.role;
                token.restaurantId = session.user?.restaurantId;
                token.slug = session.user?.slug;
            }

            // 🚨 WE DELETED THE PRISMA CALL FROM HERE 🚨

            return token;
        },

        // ─── Session Callback ──────────────────────────────────────
        async session({ session, token }) {
            if (session.user && token) {
                session.user.id = token.id as string;
                session.user.role = token.role;
                session.user.restaurantId = token.restaurantId;
                session.user.slug = token.slug;
                session.user.is_active = token.is_active;
            }
            return session;
        },

        // ─── SignIn Callback – handle post‑sign‑in redirects ──────
        async signIn({ user, account }) {
            // Let Auth.js do its job and actually save the session cookie.
            // All routing will be handled by the Next.js page they land on.
            return true;
        },
    },

    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60,
        updateAge: 24 * 60 * 60,
    },

    // cookies: {
    //     sessionToken: {
    //         name: process.env.NODE_ENV === "production"
    //             ? "__Secure-authjs.session-token"
    //             : "authjs.session-token",
    //         options: {
    //             httpOnly: true,
    //             sameSite: "lax",
    //             path: "/",
    //             secure: process.env.NODE_ENV === "production",
    //             domain:
    //                 process.env.NODE_ENV === "production"
    //                     ? ".musical-guacamole.jo"
    //                     : undefined,
    //         },
    //     },
    // },

    secret: process.env.AUTH_SECRET || "fallback-secret-change-in-production",
    trustHost: true,
    debug: process.env.NODE_ENV === "development",
});

// ═══════════════════════════════════════════════════════════════
// 3. HELPER - Get session server-side
// ═══════════════════════════════════════════════════════════════

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
    };
}