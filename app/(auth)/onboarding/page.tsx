import { OnboardingForm } from "@/components/auth/OnboardingForm";

export default function OnboardingPage() {
    return (
        <div className="flex min-h-screen items-center justify-center p-6">
            <OnboardingForm className="w-full max-w-md" />
        </div>
    );
}