// lib/Authentication/RequireJfdaAuth.ts
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";

export async function requireJfdaAuth() {
    const session = await getServerSession();

    // 1. Ensure user is logged in
    if (!session) {
        redirect("/login");
    }

    // 2. Ensure user has the correct role
    // Note: Verify if your session object uses `session.role` or `session.user.role`
    if (session.role !== "jfda_officer" && session.user?.role !== "jfda_officer") {
        redirect("/login?error=unauthorized");
    }

    // Return the safe, validated data
    return {
        userId: session.id || session.user?.id,
        user: session.user || session,
    };
}