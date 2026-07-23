// app/(auth)/denier/page.tsx
import { headers } from "next/headers";
import { getTenantContext } from "@/lib/tenant";
import { BrandedAuthLayout } from "@/components/auth/branded-auth-layout";
import { StatusScreen } from "@/components/ui/status-screen";

export default async function DenierPage() {
    const tenant = await getTenantContext();

    return (
        <BrandedAuthLayout tenant={tenant}>
            <StatusScreen
                variant="warning"
                title="Access Denied"
                message="You do not have the required permissions to view this page or your session has expired."
                actionLabel="Return to Login"
                redirectTo="/login"
                fullScreen={false}
                className="shadow-none border-0 bg-transparent p-0"
            />
        </BrandedAuthLayout>
    );
}