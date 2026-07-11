// lib/auth.ts
import { getServerSession, NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcrypt";
import { Role } from "@prisma/client";
import { SessionUser } from "@/lib/shared-types";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            email: string;
            name?: string | null;
            role?: Role | null;
            restaurantId?: number | null;
            slug?: string | null;
            is_active?: boolean | null;
        }
    }
    interface User {
        role?: Role | null;
        restaurantId?: number | null;
        slug?: string | null;
        is_active?: boolean | null;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role?: Role | null;
        restaurantId?: number | null;
        slug?: string | null;
        is_active?: boolean | null;
    }
}

export async function getSession(): Promise<SessionUser | null> {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return null;
    return {
        id: parseInt(session.user.id, 10),
        email: session.user.email,
        role: session.user.role as Role,
        full_name: session.user.name || "",
        restaurantId: session.user.restaurantId ? parseInt(String(session.user.restaurantId), 10) : undefined,
        slug: session.user.slug || undefined,
        is_active: session.user.is_active ?? true,
    };
}

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;
                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                    include: { restaurant: true }
                });
                if (!user) return null;
                const isValid = await bcrypt.compare(credentials.password, user.password_hash);
                if (!isValid) return null;
                return {
                    id: String(user.id),
                    email: user.email,
                    name: user.full_name,
                    role: user.role,
                    restaurantId: user.restaurant?.id || null,
                    slug: user.restaurant?.slug || null,
                    is_active: user.is_active,
                };
            }
        }),
        GoogleProvider({
            clientId: process.env.CLIENT_ID || "",
            clientSecret: process.env.CLIENT_SECRET || "",
            allowDangerousEmailAccountLinking: true,
            authorization: { params: { prompt: "consent" } },
            async profile(profile) {
                const email = profile.email as string;
                if (!email) throw new Error("No email provided by Google.");
                const existingUser = await prisma.user.findUnique({
                    where: { email },
                    select: { role: true, is_active: true, restaurant: { select: { slug: true } } }
                });
                return {
                    id: profile.sub as string,
                    email,
                    name: (profile.name as string) || "",
                    image: profile.picture as string,
                    role: existingUser?.role || Role.restaurant_owner,
                    is_active: existingUser?.is_active ?? true,
                    slug: existingUser?.restaurant?.slug || null,
                };
            }
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.id = user.id;
                token.slug = user.slug;
                token.is_active = user.is_active;
            } else if (token.id) {
                // Refresh token from DB (important for slug update)
                const dbUser = await prisma.user.findUnique({
                    where: { id: parseInt(token.id as string, 10) },
                    include: { restaurant: true },
                });
                if (dbUser) {
                    token.role = dbUser.role;
                    token.slug = dbUser.restaurant?.slug || null;
                    token.is_active = dbUser.is_active;
                }
            }
            return token;
        },
        async session({ session, token }) {
            session.user.role = token.role;
            session.user.id = token.id;
            session.user.slug = token.slug;
            session.user.is_active = token.is_active;
            return session;
        },
    },
    session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
    secret: process.env.NEXTAUTH_SECRET,
    pages: { signIn: "/auth/login", error: "/auth/error" },
    cookies: {
        sessionToken: {
            name: process.env.NODE_ENV === "production" ? "__Secure-next-auth.session-token" : "next-auth.session-token",
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: process.env.NODE_ENV === "production",
                domain: process.env.NODE_ENV === "production"
                    ? process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).hostname : undefined
                    : "localhost",
            },
        },
    },
};