import { prisma } from "@/lib/prisma";

export async function getTenantBySlug(slug: string) {
    const tenant = await prisma.restaurant.findUnique({
        where: { slug: slug },
        select: { id: true, slug: true, plan_tier: true }
    });

    return tenant;
}
