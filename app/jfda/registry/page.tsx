// src/app/jfda/registry/layout.tsx.tsx
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
            <div >
                <div>
                    <h2 >JFDA Connection Fault</h2>
                    <p >{response.message}</p>
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
        <div>
            <div >

                {/* Banner */}
                <div >
                    <div>
            <span >
              Regulatory Oversight
            </span>
                        <h1 >
                            JFDA Compliance Registry
                        </h1>
                        <p >
                            Jordan Food & Drug Administration official certified establish portfolio management ledger.
                        </p>
                    </div>
                </div>

                {/* Registry Table */}
                <div>
                    <table >
                        <thead>
                        <tr >
                            <th >Establishment</th>
                            <th >Owner Contact</th>
                            <th >Level Tier</th>
                            <th >Status</th>
                            <th >Regulatory Enforcement</th>
                        </tr>
                        </thead>
                        <tbody>
                        {certifiedRestaurants.length === 0 ? (
                            <tr>
                                <td>
                                    No establishments are currently registered in Level 2 or Level 3 active tiers.
                                </td>
                            </tr>
                        ) : (
                            certifiedRestaurants.map((rest: any) => (
                                <tr key={rest.id} >
                                    <td >
                                        <div>{rest.business_name}</div>
                                        <div >{rest.address_line}</div>
                                    </td>
                                    <td >
                                        <div>{rest.owner.full_name}</div>
                                        <div >{rest.owner.phone_number}</div>
                                    </td>
                                    <td >
                                        LEVEL {rest.cert_level.replace("LEVEL_", "")}
                                    </td>
                                    <td >
                                        <StatusBadge status={rest.cert_status} />
                                    </td>
                                    <td >
                                        {/* Action Dialog for Revocation */}
                                        <form action={handleRevocation} >
                                            <input type="hidden" name="restaurantId" value={rest.id} />
                                            <input
                                                required
                                                type="text"
                                                name="reason"
                                                placeholder="Log violation reason..."
                                              />
                                            <button
                                                type="submit"
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