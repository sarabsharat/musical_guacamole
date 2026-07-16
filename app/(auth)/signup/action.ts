// app/signup/actions.ts (Adjust the path to wherever your signup folder is)
"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { Role } from "@prisma/client";

export async function setGoogleUserRole(role: string) {
    const session = await getServerSession();

    if (!session?.id) {
        return { success: false, message: "Not logged in" };
    }

    await prisma.user.update({
        where: { id: Number(session.id) },
        data: { role: role as Role },
    });

    return { success: true };
}