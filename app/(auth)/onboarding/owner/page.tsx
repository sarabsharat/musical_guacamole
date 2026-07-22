// app/(auth)/onboarding/page.tsx
import { OnboardingForm } from "@/components/auth/onboarding-form";

export default function OnboardingPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
            <OnboardingForm />
        </div>
    );
}