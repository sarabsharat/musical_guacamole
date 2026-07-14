import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";

export async function requireAuditorAuth() {
    const session = await getServerSession();

    // 1. Ensure user is logged in
    if (!session) {
        redirect("/login");
    }

    // 2. Ensure user has the correct role
    if (session.role !== "nutritionist_auditor") {
        redirect("/login?error=unauthorized");
    }

    // Return the safe, validated data
    return {
        userId: session.id,
    };
}