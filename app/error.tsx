// app/error.tsx
"use client";

import { StatusScreen } from "@/components/ui/status-screen";

interface ErrorBoundaryProps {
    error: Error;
    reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
    return (
        <StatusScreen
            variant="error"
            title="Something went wrong"
            message={error.message || "An unexpected error occurred."}
            actionLabel="Try again"
            onAction={reset}
        />
    );
}