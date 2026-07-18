// components/ui/loading-screen.tsx
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingScreenProps {
    /** Whether the spinner fills the entire viewport */
    fullScreen?: boolean;
    /** Size of the spinner: sm | default | lg */
    size?: "sm" | "default" | "lg";
    /** Optional loading message to display below the spinner */
    message?: string;
    /** Additional class names */
    className?: string;
}

const sizeMap = {
    sm: "h-6 w-6",
    default: "h-10 w-10",
    lg: "h-16 w-16",
};

export function LoadingScreen({
                                  fullScreen = true,
                                  size = "default",
                                  message = "Loading...",
                                  className,
                              }: LoadingScreenProps) {
    const containerClasses = cn(
        "flex flex-col items-center justify-center gap-4",
        fullScreen && "min-h-screen",
        "bg-gradient-ember-wine",
        className
    );

    return (
        <div className={containerClasses}>
            {/* Spinner with brand primary color and subtle animation */}
            <Loader2
                className={cn(
                    "animate-spin text-primary",
                    sizeMap[size]
                )}
            />
            {message && (
                <p className="text-muted-foreground font-medium text-sm sm:text-base">
                    {message}
                </p>
            )}
        </div>
    );
}