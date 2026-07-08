// src/lib/require-auditor.ts
import { getSession, assertUserAccess } from "@/lib/security";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

export async function requireAuditorAuth() {
    const currentUser = await getSession();

   if (!currentUser) {
        redirect("/auth/login");
    }

    await assertUserAccess(currentUser, [Role.nutritionist_auditor, Role.platform_admin]);
 return {
        currentUser
    };
}