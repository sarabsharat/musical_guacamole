// src/app/auth/success/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function SuccessPage() {
    const session: any = await getServerSession(authOptions);
    if (!session) redirect("/auth/login");

    const role = session.user?.role;
    const slug = session.user?.slug;

    // Direct owner to their dedicated tenant subdomain, or administrators to their control dashboards
    if (role === "restaurant_owner" && slug) {
        redirect(`https:///${slug}.localhost:3000/owner/dashboard`);
    } else if (role === "nutritionist_auditor") {
        redirect("/auditor/queue");
    } else if (role === "jfda_officer") {
        redirect("/jfda/registry");
    } else {
        redirect("/");
    }
}