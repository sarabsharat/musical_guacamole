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
        }
    }
    interface User {
        role?: Role | null;
        restaurantId?: number | null;
        slug?: string | null;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role?: Role | null;
        restaurantId?: number | null;
        slug?: string | null;
    }
}

// who is this person and what is the restaurant they own ???
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
    };
}

export const authOptions: NextAuthOptions = {
    // We use Prisma to store users, but JWTs for the actual session tracking
    adapter: PrismaAdapter(prisma) as any,
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

                // this is where the user is tied to the slug
                // prisma finds the user and includes the res they are attached to
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

                // extract the id and slug from the attached res, and if the user has no res it falls back
                return {
                    id: String(user.id),
                    email: user.email,
                    name: user.full_name,
                    role: user.role,
                    restaurantId: user.restaurant?.id || null,
                    slug: user.restaurant?.slug || null,
                };
            }
        }),
        GoogleProvider({
            clientId: process.env.CLIENT_ID || "",
            clientSecret: process.env.CLIENT_SECRET || "",
            authorization: {
                params: {
                    prompt: "consent",
                }
            }
        })
    ],
    callbacks: {
        //Runs immediately after 'authorize' succeeds.
        async jwt({ token, user}) {
            // stamp the res id and slug to the jwt token of user
            // 'user' only exists the very first time this runs right after login
            if (user) {
                token.slug = user.slug;
                token.restaurantId = user.restaurantId;
                token.role = user.role;
            }
            return token; // This token is then encrypted and saved as a cookie
        },

        // Runs every time a component calls getServerSession()
        async session({ session, token }) {
            // We take the custom data we stamped into the token in Step 1,
            // and attach it to the visible session object for the frontend to use.
            if (session.user) {
                session.user.slug = token.slug;
                session.user.restaurantId = token.restaurantId;
                session.user.role = token.role;
                session.user.id = token.sub as string; // 'sub' is the default JWT ID field
            }
            return session;
        }
    },
    session: { strategy: "jwt" },
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: "/auth/login",
    },
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
    }
};