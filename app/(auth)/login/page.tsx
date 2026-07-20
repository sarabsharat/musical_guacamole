// app/(auth)/login/page.tsx
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { BrandedAuthLayout } from "@/components/auth/branded-auth-layout";
import { getTenantContext } from "@/lib/tenant";

export default async function LoginPage() {
    const tenant = await getTenantContext();

    return (
        <BrandedAuthLayout
            tenant={tenant}
            platformLogo="/favicon.ico"
            platformLogoPosition="top-left"
            fallbackLogo="/favicon.ico"
        >
            {/* 🚨 Wrap the form in Suspense to support useSearchParams */}
            <Suspense fallback={<div className="p-4 text-center">Loading login...</div>}>
                <LoginForm />
            </Suspense>
        </BrandedAuthLayout>
    );
}