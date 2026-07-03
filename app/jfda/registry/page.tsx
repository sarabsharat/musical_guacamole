// src/app/jfda/registry/page.tsx.tsx
import React from "react";
import { getJfdaCertifiedRegistry, revokeRestaurantCompliance } from "@/actions/jfda";
import { getSession, assertUserAccess } from "@/lib/security";
import { StatusBadge } from "@/components/shared/status-badge";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function JfdaRegistryPage() {
    // 1. Authorize session role
    const session = await getSession();
    await assertUserAccess(session, [Role.jfda_officer, Role.platform_admin]);

    // 2. Query registry records
    const response = await getJfdaCertifiedRegistry();

    if (!response.success || !response.data) {
        return (
            <div className="min-h-screen bg-neutral-100 p-8 text-black">
                <div className="border-4 border-red-600 bg-red-50 p-6 rounded-none">
                    <h2 className="font-mono text-xl font-bold uppercase text-red-600">JFDA Connection Fault</h2>
                    <p className="mt-2 font-mono text-xs text-red-700">{response.message}</p>
                </div>
            </div>
        );
    }

    const certifiedRestaurants = response.data;

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
        <div className="min-h-screen bg-neutral-100 p-8 text-black font-mono">
            <div className="mx-auto max-w-5xl border-4 border-black bg-white p-6 rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6">

                {/* Banner */}
                <div className="border-b-4 border-black pb-4 flex justify-between items-end">
                    <div>
            <span className="bg-red-600 text-white px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-none border border-black">
              Regulatory Oversight
            </span>
                        <h1 className="text-3xl font-extrabold uppercase mt-2">
                            JFDA Compliance Registry
                        </h1>
                        <p className="text-xs text-neutral-600 mt-1">
                            Jordan Food & Drug Administration official certified establish portfolio management ledger.
                        </p>
                    </div>
                </div>

                {/* Registry Table */}
                <div className="border-4 border-black overflow-x-auto bg-white rounded-none">
                    <table className="w-full text-xs text-left border-collapse">
                        <thead>
                        <tr className="bg-black text-white border-b-4 border-black font-bold uppercase">
                            <th className="p-3">Establishment</th>
                            <th className="p-3">Owner Contact</th>
                            <th className="p-3">Level Tier</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Regulatory Enforcement</th>
                        </tr>
                        </thead>
                        <tbody>
                        {certifiedRestaurants.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-neutral-500 italic">
                                    No establishments are currently registered in Level 2 or Level 3 active tiers.
                                </td>
                            </tr>
                        ) : (
                            certifiedRestaurants.map((rest: any) => (
                                <tr key={rest.id} className="border-b-2 border-black hover:bg-neutral-50">
                                    <td className="p-3 font-bold">
                                        <div>{rest.business_name}</div>
                                        <div className="text-[10px] text-neutral-400 font-normal mt-1">{rest.address_line}</div>
                                    </td>
                                    <td className="p-3">
                                        <div>{rest.owner.full_name}</div>
                                        <div className="text-[10px] text-neutral-500 mt-1">{rest.owner.phone_number}</div>
                                    </td>
                                    <td className="p-3 font-bold">
                                        LEVEL {rest.cert_level.replace("LEVEL_", "")}
                                    </td>
                                    <td className="p-3">
                                        <StatusBadge status={rest.cert_status} />
                                    </td>
                                    <td className="p-3 text-right">
                                        {/* Action Dialog for Revocation */}
                                        <form action={handleRevocation} className="inline-flex gap-2 items-center justify-end">
                                            <input type="hidden" name="restaurantId" value={rest.id} />
                                            <input
                                                required
                                                type="text"
                                                name="reason"
                                                placeholder="Log violation reason..."
                                                className="border border-black p-1 text-[10px] rounded-none focus:outline-none bg-neutral-50"
                                            />
                                            <button
                                                type="submit"
                                                className="bg-red-600 hover:bg-red-700 text-white border border-black font-bold uppercase px-2.5 py-1 text-[10px] rounded-none"
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
        </div>
    );
}