// src/app/owner/page.tsx
import { requireOwnerAuth } from "@/lib/RequireOwnerAuth";
import { redirect } from "next/navigation";

export default async function OwnerIndexPage() {

    await requireOwnerAuth();
    redirect("/owner/dashboard");
}