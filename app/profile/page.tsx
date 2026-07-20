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

    // 3. Format certification level string (e.g., "LEVEL_2" -> 2)
    let certLevel = 1;
    if (dbUser.restaurant?.cert_level) {
        const parsed = parseInt(dbUser.restaurant.cert_level.replace("LEVEL_", ""));
        if (!isNaN(parsed)) certLevel = parsed;
    }

    // 4. Map DB data to the ProfileData interface
    const profileData: ProfileData = {
        fullName: dbUser.full_name || "Platform User",
        email: dbUser.email,
        phone: "", // Replace with dbUser.phone if you add that column to your Prisma schema
        businessName: dbUser.restaurant?.business_name || "No Business Associated",
        level: certLevel,
        status: (dbUser.restaurant?.cert_status as ProfileData["status"]) || "PENDING",
        language: "en", // Hardcoded fallback until added to DB schema
    };

    // 5. Render the client view
    return <ProfileView profile={profileData} />;
}