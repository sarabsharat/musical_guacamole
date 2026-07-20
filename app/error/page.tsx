// app/error/page.tsx
"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { StatusScreen } from "@/components/ui/status-screen";

function ErrorContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const message = searchParams.get("message") || "An unexpected error occurred.";

    return (
        <StatusScreen
            variant="error"
            title="Access Denied"
            message={message}
            actionLabel="Back to Login"
            onAction={() => router.push("/login")}
        />
    );
}

export default function ErrorPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
            <ErrorContent />
        </Suspense>
    );
}