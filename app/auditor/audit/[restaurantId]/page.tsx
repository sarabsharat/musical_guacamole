// app/auditor/audit/[restaurantId]/page.tsx
import React from "react";
import { notFound } from "next/navigation";
import { requireAuditorAuth } from "@/lib/Authentication/RequireAuditorAuth";
import { prisma } from "@/lib/prisma";
import { SiteAuditForm } from "@/components/auditor/site-audit-form";

interface PageProps {
    params: Promise<{ restaurantId: string }>;
}

export default async function SiteAuditPage({ params }: PageProps) {
    await requireAuditorAuth();

    const { restaurantId } = await params;
    const id = parseInt(restaurantId, 10);
    if (isNaN(id)) return notFound();

    const restaurant = await prisma.restaurant.findUnique({
        where: { id },
        select: {
            id: true,
            business_name: true,
            slug: true,
            cert_level: true,
            cert_status: true,
        },
    });

    if (!restaurant) return notFound();

    return (
        <div className="flex flex-col gap-6 px-4 lg:px-6 py-4">
            <div className="border-b border-border pb-4">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Site Audit</h1>
                <p className="text-base text-muted-foreground mt-1">{restaurant.business_name}</p>
            </div>

            <SiteAuditForm restaurant={restaurant} />
        </div>
    );
}