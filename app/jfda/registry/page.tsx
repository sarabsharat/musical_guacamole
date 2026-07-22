// src/app/jfda/registry/page.tsx
import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getJfdaCertifiedRegistry, revokeRestaurantCompliance } from "@/actions/JfdaActions";
import { StatusBadge } from "@/components/shared/status-badge";
import { Role } from "@prisma/client";

export const revalidate = 0;

interface CertifiedRestaurant {
    id: number;
    business_name: string;
    address_line: string;
    owner: {
        full_name: string;
        phone_number: string;
    };
    cert_level: string;
    cert_status: string;
}

export default async function JfdaRegistryPage() {
    // 1. Authenticate and authorize – only JFDA officers and admins
    const session = await auth();
    if (!session?.user || (session.user.role !== Role.jfda_officer && session.user.role !== Role.platform_admin)) {
        redirect("/login");
    }

    // 2. Query registry records (pass empty object if action expects params)
    const response = await getJfdaCertifiedRegistry({});

    if (!response.success || !response.data) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background p-8">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-destructive">JFDA Connection Fault</h2>
                    <p className="text-muted-foreground">{response.message}</p>
                </div>
            </div>
        );
    }

    const certifiedRestaurants = response.data as CertifiedRestaurant[];

    // 3. Server action form handler to revoke compliance instantly
    async function handleRevocation(formData: FormData) {
        "use server";
        const restaurantIdStr = formData.get("restaurantId")?.toString();
        const reason = formData.get("reason")?.toString() || "";

        if (!restaurantIdStr || !reason.trim()) return;

        const res = await revokeRestaurantCompliance(parseInt(restaurantIdStr, 10), reason);
        if (res.success) {
            redirect("/jfda/registry");
        }
    }

    return (
        <div className="flex flex-col gap-6 px-4 lg:px-6 py-4">
            {/* Banner */}
            <div className="border-b border-border pb-4">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Regulatory Oversight
                </span>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">JFDA Compliance Registry</h1>
                <p className="text-base text-muted-foreground mt-1">
                    Jordan Food & Drug Administration official certified establishment portfolio management ledger.
                </p>
            </div>

            {/* Registry Table */}
            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
                <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                    <tr className="border-b border-border">
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wider">
                            Establishment
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wider">
                            Owner Contact
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wider">
                            Level Tier
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wider">
                            Status
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wider">
                            Regulatory Enforcement
                        </th>
                    </tr>
                    </thead>
                    <tbody>
                    {certifiedRestaurants.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                No establishments are currently registered in Level 2 or Level 3 active tiers.
                            </td>
                        </tr>
                    ) : (
                        certifiedRestaurants.map((rest) => (
                            <tr key={rest.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3">
                                    <div className="font-medium text-foreground">{rest.business_name}</div>
                                    <div className="text-xs text-muted-foreground">{rest.address_line}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="text-sm">{rest.owner.full_name}</div>
                                    <div className="text-xs text-muted-foreground">{rest.owner.phone_number}</div>
                                </td>
                                <td className="px-4 py-3">
                                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                                            LEVEL {rest.cert_level.replace("LEVEL_", "")}
                                        </span>
                                </td>
                                <td className="px-4 py-3">
                                    <StatusBadge status={rest.cert_status} />
                                </td>
                                <td className="px-4 py-3">
                                    <form action={handleRevocation} className="flex items-center gap-2">
                                        <input type="hidden" name="restaurantId" value={rest.id} />
                                        <input
                                            required
                                            type="text"
                                            name="reason"
                                            placeholder="Log violation reason..."
                                            className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                        <button
                                            type="submit"
                                            className="rounded-md bg-destructive px-3 py-1 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors"
                                        >
                                            Revoke
                                        </button>
                                    </form>
                                </td>
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}