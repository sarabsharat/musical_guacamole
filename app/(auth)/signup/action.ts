// app/signup/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { Role } from "@prisma/client";

export async function setGoogleUserRole(role: string) {
    const session = await getServerSession();

    if (!session || !session.id) {
        return { success: false, message: "Not logged in" };
    }

    // Safely parse the ID into a clean integer for Prisma
    const userId = parseInt(String(session.id), 10);

    if (isNaN(userId)) {
        return { success: false, message: "Invalid user ID" };
    }

    await prisma.user.update({
        where: { id: userId },
        data: { role: role as Role },
    });

    return { success: true };
}