// lib/auth.ts - Phase 2: Complete Auth.js v5 with Credentials Provider
import NextAuth, { type DefaultSession, type User } from "next-auth";
import { type JWT } from "next-auth/jwt"; // FIX 1: Import JWT to allow augmentation
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

// ═══════════════════════════════════════════════════════════════
// 1. EXTEND TYPES - Add custom fields to Session, User, and JWT
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

    // FIX 3: Extend the User object so we don't need 'any' later
    interface User {
        role: Role | null;
        restaurantId: number | null;
        slug: string | null;
        is_active: boolean | null;
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
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "owner@restaurant.com" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    console.log("❌ [Auth] Missing email or password");
                    return null;
                }

                try {
                    const user = await prisma.user.findUnique({
                        where: { email: credentials.email as string },
                        include: { restaurant: true },
                    });

                    if (!user) {
                        console.log("❌ [Auth] User not found:", credentials.email);
                        return null;
                    }

                    if (!user.is_active) {
                        console.log("❌ [Auth] User is inactive:", credentials.email);
                        return null;
                    }

                    // FIX 2: Check if password exists before using bcrypt (Handles OAuth users)
                    if (!user.password_hash) {
                        console.log("❌ [Auth] User has no password (OAuth user):", credentials.email);
                        return null;
                    }

                    const passwordMatch = await bcrypt.compare(
                        credentials.password as string,
                        user.password_hash
                    );

                    if (!passwordMatch) {
                        console.log("❌ [Auth] Invalid password for:", credentials.email);
                        return null;
                    }

                    console.log("✅ [Auth] User authenticated:", credentials.email);

                    return {
                        id: String(user.id),
                        email: user.email,
                        name: user.full_name,
                        role: user.role,
                        restaurantId: user.restaurant?.id || null,
                        slug: user.restaurant?.slug || null,
                        is_active: user.is_active,
                    };
                } catch (error) {
                    console.error("❌ [Auth] Error in authorize:", error);
                    return null;
                }
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
                console.log("🔐 [JWT] Populating token from user:", user.email);
                token.id = user.id as string;

                // FIX 3: No 'any' needed here because we extended the User interface
                token.role = user.role;
                token.restaurantId = user.restaurantId;
                token.slug = user.slug;
                token.is_active = user.is_active;
            }

            if (trigger === "update" && session) {
                console.log("🔄 [JWT] Updating token from session update");
                token.role = session.user?.role;
                token.restaurantId = session.user?.restaurantId;
                token.slug = session.user?.slug;
            }

            if (token.id && !user) {
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: parseInt(token.id, 10) },
                        include: { restaurant: true },
                    });

                    if (dbUser) {
                        token.role = dbUser.role;
                        token.restaurantId = dbUser.restaurant?.id || null;
                        token.slug = dbUser.restaurant?.slug || null;
                        token.is_active = dbUser.is_active;
                    }
                } catch (error) {
                    console.error("❌ [JWT] Error refreshing token:", error);
                }
            }

            return token;
        },
        async session({ session, token }) {
            if (session.user && token) {
                console.log("📋 [Session] Building session for:", session.user.email);
                session.user.id = token.id;
                session.user.role = token.role;
                session.user.restaurantId = token.restaurantId;
                session.user.slug = token.slug;
                session.user.is_active = token.is_active;
            }
            return session;
        },
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60,
        updateAge: 24 * 60 * 60,
    },
    cookies: {
        sessionToken: {
            name: process.env.NODE_ENV === "production"
                ? "__Secure-authjs.session-token"
                : "authjs.session-token",
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: process.env.NODE_ENV === "production",
                domain:
                    process.env.NODE_ENV === "production"
                        ? ".musical-guacamole.jo"
                        : undefined,
            },
        },
    },
    secret: process.env.AUTH_SECRET || "fallback-secret-change-in-production",
    trustHost: true,
    debug: process.env.NODE_ENV === "development",
});

// ═══════════════════════════════════════════════════════════════
// 3. HELPER - Get session server-side
// ═══════════════════════════════════════════════════════════════

export async function getServerSession() {
    const session = await auth();

    if (!session?.user) {
        return null;
    }

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