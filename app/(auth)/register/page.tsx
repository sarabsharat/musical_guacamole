import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
    return (
        <div className="flex min-h-screen items-center justify-center p-6">
            <RegisterForm className="w-full max-w-md" />
        </div>
    );
}