import { NextResponse } from "next/server";
import { getTenantBySlug } from "@/lib/tenant";

export async function GET(
    request: Request,
    // 1. Update the type to expect a Promise
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        // 2. AWAIT the params before extracting the slug!
        const resolvedParams = await params;
        const tenant = await getTenantBySlug(resolvedParams.slug);

        if (!tenant) {
            return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
        }

        return NextResponse.json(tenant);
    } catch (error) {
        console.error("Tenant Fetch Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}