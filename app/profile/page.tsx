// app/profile/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileView, type ProfileData } from "./profile-view";

export default async function ProfilePage() {
    // 1. Verify authentication
    const session = await auth();
    if (!session?.user?.id) {
        redirect("/login");
    }

    // 2. Fetch fresh user data from the database
    const dbUser = await prisma.user.findUnique({
        where: { id: Number(session.user.id) },
        include: { restaurant: true },
    });

    if (!dbUser) {
        redirect("/login");
    }

    // 3. Determine user role for different display logic
    const isAuditor = dbUser.role === "nutritionist_auditor";
    const isOwner = dbUser.role === "restaurant_owner";

    // 4. Format certification level string (only for restaurant owners)
    let certLevel = 1;
    if (isOwner && dbUser.restaurant?.cert_level) {
        const parsed = parseInt(dbUser.restaurant.cert_level.replace("LEVEL_", ""));
        if (!isNaN(parsed)) certLevel = parsed;
    }

    // 5. Build profile data based on role
    let profileData: ProfileData;

    if (isAuditor) {
        // ─── AUDITOR PROFILE ────────────────────────────────
        const verificationStatus = dbUser.verification_status || "UNVERIFIED";
        const statusMap: Record<string, "PENDING" | "APPROVED" | "REJECTED" | "ACTIVE"> = {
            "UNVERIFIED": "PENDING",
            "PENDING": "PENDING",
            "VERIFIED": "APPROVED",
            "REJECTED": "REJECTED",
        };

        profileData = {
            fullName: dbUser.full_name || "Auditor",
            email: dbUser.email || "",
            phone: dbUser.phone_number || "",
            businessName: "Nutritionist Auditor",
            level: 0, // Auditors don't have levels
            status: statusMap[verificationStatus] || "PENDING",
            language: "en",
            // Additional auditor fields
            role: "nutritionist_auditor",
            verificationStatus: verificationStatus,
            certificationUrl: dbUser.certification_url,
        };
    } else {
        // ─── RESTAURANT OWNER PROFILE ──────────────────────
        profileData = {
            fullName: dbUser.full_name || "Platform User",
            email: dbUser.email || "",
            phone: dbUser.phone_number || "",
            businessName: dbUser.restaurant?.business_name || "No Business Associated",
            level: certLevel,
            status: (dbUser.restaurant?.cert_status as ProfileData["status"]) || "PENDING",
            language: "en",
            role: "restaurant_owner",
        };
    }

    // 6. Render the client view
    return <ProfileView profile={profileData} />;
}