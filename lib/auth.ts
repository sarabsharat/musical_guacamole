// lib/auth.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { Role } from "@prisma/client";
import {SessionUser} from "@/lib/shared-types";

export async function getSession(): Promise<SessionUser | null> {
    const session: any = await getServerSession(authOptions);
    if (!session || !session.user) return null;

    return {
        id: parseInt(session.user.id, 10), // Safe parsing
        email: session.user.email,
        role: session.user.role as Role,
        full_name: session.user.name,
        restaurantId: session.user.restaurantId ? parseInt(session.user.restaurantId, 10) : undefined,
        slug: session.user.slug || undefined,
    };
}