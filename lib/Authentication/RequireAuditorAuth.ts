// lib/Authentication/RequireAuditorAuth.ts
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Role, VerificationStatus } from "@prisma/client";

export async function requireAuditorAuth() {
    const session = await auth();

    // 1. Authentication Wall
    if (!session?.user) {
        redirect("/login");
    }

    // 2. Authorization (RBAC) Wall
    if (
        session.user.role !== Role.nutritionist_auditor &&
        session.user.role !== Role.platform_admin
    ) {
        redirect("/unauthorized");
    }

    // 3. Type Safety for ID
    const parsedId = parseInt(session.user.id as string, 10);

    if (isNaN(parsedId)) {
        console.error("Invalid user ID in session:", session.user.id);
        redirect("/login");
    }

    // 🚨 We no longer redirect pending/unverified auditors here.
    // Instead, they pass through so you can render a warning banner in the UI.

    return {
        userId: parsedId,
        role: session.user.role,
        verificationStatus: session.user.verification_status, // Pass status for UI checks
        user: {
            ...session.user,
            id: parsedId,
        },
    };
}