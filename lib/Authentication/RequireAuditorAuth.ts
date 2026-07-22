import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

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
        redirect("/login"); // Or throw an error, depending on your flow
    }

    return {
        userId: parsedId,
        role: session.user.role,
        user: {
            ...session.user,
            id: parsedId,
        },
    };
}