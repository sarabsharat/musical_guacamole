import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function getTenantContext() {
    const host = (await headers()).get("host") || "";
    const hostname = host.split(":")[0]; // remove port
    const parts = hostname.split(".");

    // If we have more than 2 parts and first is not 'www' or 'localhost'
    if (parts.length >= 2 && parts[0] !== "www" && parts[0] !== "localhost") {
        const slug = parts[0];
        const tenant = await prisma.restaurant.findUnique({
            where: { slug },
        });
        return tenant;
    }
    return null;
}