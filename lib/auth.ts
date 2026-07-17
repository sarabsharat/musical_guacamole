// lib/auth.ts
import NextAuth, { type DefaultSession, type User } from "next-auth";
import { type JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

// ─── Extend types ──────────────────────────────────────────────
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
        dbId?: number; // 🚨 Added to allow safely passing the Prisma integer ID
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

// ─── Auth config ───────────────────────────────────────────────
export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        // ─── Credentials ──────────────────────────────────────────
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
                    dbId: user.id, // 🚨 Smuggle the real database integer
                    email: user.email,
                    name: user.full_name,
                    role: user.role,
                    restaurantId: user.restaurant?.id || null,
                    slug: user.restaurant?.slug || null,
                    is_active: user.is_active,
                };
            },
        }),

        // ─── Google ────────────────────────────────────────────────
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

                // 🚨 Added `include: { restaurant: true }` so we can access the slug
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
                    dbId: user.id, // 🚨 Smuggle the real database integer
                    email: user.email,
                    name: user.full_name,
                    role: user.role,
                    restaurantId: user.restaurant?.id || null,
                    slug: user.restaurant?.slug || null, // ✅ Fixes the TS2322 Error
                    is_active: user.is_active,
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
                // 🚨 Override NextAuth's UUID with our smuggled database integer
                token.id = String(user.dbId || user.id);
                token.role = user.role;
                token.restaurantId = user.restaurantId;
                token.slug = user.slug;
                token.is_active = user.is_active;
            }

            if (trigger === "update" && session) {
                token.role = session.user?.role;
                token.restaurantId = session.user?.restaurantId;
                token.slug = session.user?.slug;
            }
            return token;
        },

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

        // ─── SignIn callback ──────────────────────────────────────
        async signIn({ user }) {
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
            name: process.env.NODE_ENV === "production" ? "__Secure-authjs.session-token" : "authjs.session-token",
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: process.env.NODE_ENV === "production",
                // Set the domain to the root domain
                domain: process.env.NODE_ENV === "production" ? ".musical-guacamole.jo" : ".myapp.test",
            },
        },
        callbackUrl: {
            name: process.env.NODE_ENV === "production" ? "__Secure-authjs.callback-url" : "authjs.callback-url",
            options: {
                sameSite: "lax",
                path: "/",
                secure: process.env.NODE_ENV === "production",
                domain: process.env.NODE_ENV === "production" ? ".musical-guacamole.jo" : undefined,
            },
        },
        csrfToken: {
            name: process.env.NODE_ENV === "production" ? "__Secure-authjs.csrf-token" : "authjs.csrf-token",
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: process.env.NODE_ENV === "production",
                domain: process.env.NODE_ENV === "production" ? ".musical-guacamole.jo" : undefined,
            },
        },
        pkceCodeVerifier: {
            name: process.env.NODE_ENV === "production" ? "__Secure-authjs.pkce.code_verifier" : "authjs.pkce.code_verifier",
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: process.env.NODE_ENV === "production",
                maxAge: 900,
                domain: process.env.NODE_ENV === "production" ? ".musical-guacamole.jo" : ".myapp.test",
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
        // 🚨 Make sure these are pulled from session.user
        restaurantId: session.user.restaurantId,
        slug: session.user.slug,
        is_active: session.user.is_active ?? true,
    };
}