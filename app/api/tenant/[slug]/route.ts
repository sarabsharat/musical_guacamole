// app/api/v1/tenant/[slug]/route.ts
import { NextResponse } from "next/server";
import { getTenantBySlug } from "@/lib/tenant";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        // API Key check
        const apiKey = request.headers.get("x-api-key");
        if (!apiKey || apiKey !== process.env.API_KEY) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const tenant = await getTenantBySlug(resolvedParams.slug);

        if (!tenant) {
            return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
        }

        // Return only public fields
        const publicData = {
            business_name: tenant.business_name,
            logo_url: tenant.logo_url,
            background_image_url: tenant.background_image_url,
        };

        return NextResponse.json(publicData);
    } catch (error) {
        console.error("Tenant API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}