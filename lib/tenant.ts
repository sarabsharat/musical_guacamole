import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function getTenantContext() {
    // 1. Get the host header (e.g., "dev-tenant.localhost:3000")
    const headersList = await headers();
    const host = headersList.get("host") || "";

    // 2. Strip the port (Leaves "dev-tenant.localhost")
    const hostWithoutPort = host.split(":")[0];

    // 3. Extract just the slug
    let slug = null;
    if (hostWithoutPort.includes(".localhost")) {
        // Local development extraction
        slug = hostWithoutPort.replace(".localhost", "");
    } else {
        // Production extraction (Update this to your actual live domain later!)
        slug = hostWithoutPort.replace(".musical-guacamole.jo", "");
    }

    // If no slug is found, it's not a valid tenant URL
    if (!slug || slug === "localhost" || slug === "musical-guacamole.jo") {
        return null;
    }

    // 4. Query Prisma using ONLY the exact slug ("dev-tenant")
    const tenant = await prisma.restaurant.findUnique({
        where: { slug: slug },
    });

    return tenant;
}