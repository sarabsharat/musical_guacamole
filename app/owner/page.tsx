// src/app/owner/page.tsx
import { requireOwnerAuth } from "@/lib/Authentication/RequireOwnerAuth";
import { redirect } from "next/navigation";

export default async function OwnerIndexPage() {
    // 1. Verify they are an owner and have a restaurant
    await requireOwnerAuth();

    // 2. Bounce them to the actual dashboard page
    redirect("/owner/dashboard");
}