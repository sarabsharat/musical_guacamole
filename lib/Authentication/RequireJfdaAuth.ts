// lib/Authentication/RequireJfdaAuth.ts
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function requireJfdaAuth() {
    const session = await auth();

    // 1. Ensure user and session exist
    if (!session || !session.user) {
        redirect("/login");
    }

    // 2. Ensure user has the correct role strictly through the user object
    if (session.user.role !== "jfda_officer") {
        redirect("/login?error=unauthorized");
    }

    // Return the safe, validated data
    return {
        userId: session.user.id,
        user: session.user,
    };
}