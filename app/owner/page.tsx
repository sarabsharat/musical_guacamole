import { requireOwnerAuth } from "@/lib/RequireOwnerAuth";
import { redirect } from "next/navigation";
export default function OwnerIndexPage() {
    requireOwnerAuth().then(r => {
        redirect("/owner/dashboard");
    });
}