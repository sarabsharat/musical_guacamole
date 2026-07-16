import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";

export default async function DashboardRouter() {
    const session = await getServerSession();

    if (!session) {
        redirect("/login");
    }

    // 🚨 THE FIX: If they just used Google and haven't picked a role yet,
    // send them to your Signup Hub to click one of the 3 cards.
    if (!session.role) {
        redirect("/signup");
    }

    // 2. Evaluate Role for existing users
    switch (session.role) {
        case "restaurant_owner":
            if (!session.restaurantId) {
                redirect("/onboarding");
            }
            redirect("/owner/dashboard");

        case "nutritionist_auditor":
            redirect("/auditor/dashboard");

        case "jfda_officer":
            redirect("/jfda/dashboard");

        default:
            redirect("/login");
    }
}