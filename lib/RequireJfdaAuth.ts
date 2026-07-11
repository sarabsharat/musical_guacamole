// src/lib/require-AuditorActions.ts
import { getSession, assertUserAccess } from "@/lib/security";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

export async function requireJfdaAuth() {
    const currentUser = await getSession();

   if (!currentUser) {
        redirect("/login");
    }

    await assertUserAccess(currentUser, [Role.jfda_officer]);
 return {
        currentUser
    };
}