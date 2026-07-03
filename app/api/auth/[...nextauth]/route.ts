// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export const authOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    console.error("Missing credentials");
                    return null;
                }
                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                    include: { restaurant: true }
                });
                if (!user) {
                    console.error("User not found:", credentials.email);
                    return null;
                }
                const isValid = await bcrypt.compare(credentials.password, user.password_hash);
                if (!isValid) {
                    console.error("Invalid password for:", credentials.email);
                    return null;
                }

                // Return structured session profile
                return {
                    id: String(user.id),
                    email: user.email,
                    name: user.full_name,
                    role: user.role,
                    restaurantId: user.restaurant?.id || null,
                    slug: user.restaurant?.slug || null,
                };
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }: { token: any; user: any }) {
            if (user) {
                token.id = user.id; // Map User ID securely
                token.role = user.role;
                token.restaurantId = user.restaurantId;
                token.slug = user.slug;
            }
            return token;
        },
        async session({ session, token }: { session: any; token: any }) {
            if (token) {
                session.user.id = token.id; // Inject user ID to session
                session.user.role = token.role;
                session.user.restaurantId = token.restaurantId;
                session.user.slug = token.slug;
            }
            return session;
        }
    },
    session: { strategy: "jwt" as const },
    pages: {
        signIn: "/auth/login", // Redirect to clean login route
    },
    // BUG FIX: Share session cookies across all local subdomains
    cookies: {
        sessionToken: {
            name: `next-auth.session-token`,
            options: {
                path: "/",
                httpOnly: true,
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production",
            }
        }
    },
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };