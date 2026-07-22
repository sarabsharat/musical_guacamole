// app/onboarding/auditor/page.tsx
import { OnboardingAuditorForm } from "@/components/auth/onboarding-auditor-form";
import { requireAuditorAuth } from "@/lib/Authentication/RequireAuditorAuth";

export default async function OnboardingAuditorPage() {
    // Ensure only auditors can access this page
    await requireAuditorAuth();

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <OnboardingAuditorForm />
        </div>
    );
}