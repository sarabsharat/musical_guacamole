// app/(auth)/login/page.tsx

import { LoginForm } from "@/components/auth/login-form";
import { BrandedAuthLayout } from "@/components/auth/branded-auth-layout";
import { getTenantContext } from "@/lib/tenant";

export default async function LoginPage() {
    const tenant = await getTenantContext();

    return (
        <BrandedAuthLayout
            tenant={tenant}
            platformLogo="/favicon.ico" // your brand logo
            platformLogoPosition="top-left"
            fallbackLogo="/favicon.ico" // optional
        >
            <LoginForm />
        </BrandedAuthLayout>
    );
}