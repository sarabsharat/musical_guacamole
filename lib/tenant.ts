// src/lib/tenant.ts
import { cache } from "react";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export interface TenantContext {
    id: number;
    slug: string;
    business_name: string;
    cert_level: string;
    cert_status: string;
}

/**
 * Resolves tenant details on the server during the request lifecycle.
 */
// cache rememebrs the result of this function for a page load, so it onyl hits databse once
export const getTenantContext = cache(async (): Promise<TenantContext | null> => {
    try {

        //read headers, this is a readonly list by next.js
        const headersList = await headers();

        //extract the slug that our middleware injected
        const slug = headersList.get("x-tenant-slug");
    //no slug exit
        if (!slug) {
            return null;
        }
        //parameterized stamtens if malicious user sql inject to slug header, it become plain text

        const restaurant = await prisma.restaurant.findUnique({
            where: { slug },
            //select to only return those values
            select: {
                id: true,
                slug: true,
                business_name: true,
                cert_level: true,
                cert_status: true,
            },
        });
        // if no restaurant exist in db exit
        if (!restaurant) {
            return null;
        }
        //return the object
        return {
            id: restaurant.id,
            slug: restaurant.slug,
            business_name: restaurant.business_name,
            cert_level: restaurant.cert_level,
            cert_status: restaurant.cert_status,
        };
    } catch (error) {
        //db error
        console.error("Tenant resolution failed:", error);
        return null;
    }
});


//passes everything, should only be in admin dashboards
export async function getTenantBySlug(slug: string) {
    return prisma.restaurant.findUnique({
        where: { slug },
        include: { owner: true },
    });
}