// components/ui/status-screen.tsx
"use client";

import Link from "next/link";
import { AlertCircle, AlertTriangle, Info, CheckCircle, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatusVariant = "error" | "warning" | "info" | "success";

interface StatusScreenProps {
    /** The main title */
    title: string;
    /** The descriptive message */
    message: string;
    /** Visual style: error (destructive), warning (accent), info (primary), success (green) */
    variant?: StatusVariant;
    /** Optional icon override (default is based on variant) */
    icon?: LucideIcon;
    /** Action label (e.g., "Try again", "Return to Login") */
    actionLabel?: string;
    /** If provided, the action becomes a link to this URL */
    redirectTo?: string;
    /** If provided, the action calls this function (e.g., reset) */
    onAction?: () => void;
    /** Whether the card fills the viewport */
    fullScreen?: boolean;
    /** Additional classes for the container */
    className?: string;
}

const variantConfig = {
    error: {
        icon: AlertCircle,
        cardClass: "border-destructive/20",
        iconBg: "bg-destructive/10",
        iconColor: "text-destructive",
        buttonClass: "bg-destructive hover:bg-destructive/90",
    },
    warning: {
        icon: AlertTriangle,
        cardClass: "border-accent/20",
        iconBg: "bg-accent/10",
        iconColor: "text-accent",
        buttonClass: "bg-accent hover:bg-accent/90 text-foreground",
    },
    info: {
        icon: Info,
        cardClass: "border-primary/20",
        iconBg: "bg-primary/10",
        iconColor: "text-primary",
        buttonClass: "bg-primary hover:bg-primary/90",
    },
    success: {
        icon: CheckCircle,
        cardClass: "border-green-500/20",
        iconBg: "bg-green-500/10",
        iconColor: "text-green-500",
        buttonClass: "bg-green-600 hover:bg-green-700",
    },
};

export function StatusScreen({
                                 title,
                                 message,
                                 variant = "error",
                                 icon: IconOverride,
                                 actionLabel,
                                 redirectTo,
                                 onAction,
                                 fullScreen = true,
                                 className,
                             }: StatusScreenProps) {
    const config = variantConfig[variant];
    const Icon = IconOverride || config.icon;

    const containerClasses = cn(
        "flex items-center justify-center p-4",
        fullScreen && "min-h-screen",
        className
    );

    // Decide what the action button does
    const renderAction = () => {
        if (!actionLabel) return null;

        if (redirectTo) {
            return (
                <Link href={redirectTo} className="w-full">
                    <Button className={cn("w-full gap-2", config.buttonClass)}>
                        {actionLabel}
                    </Button>
                </Link>
            );
        }

        if (onAction) {
            return (
                <Button onClick={onAction} className={cn("w-full gap-2", config.buttonClass)}>
                    {actionLabel}
                </Button>
            );
        }

        return null;
    };

    return (
        <div className={containerClasses}>
            <Card className={cn("w-full max-w-md shadow-lg", config.cardClass)}>
                <CardHeader className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className={cn("rounded-full p-2", config.iconBg, config.iconColor)}>
                            <Icon className="h-6 w-6" />
                        </div>
                        <CardTitle className="text-2xl text-foreground">{title}</CardTitle>
                    </div>
                    <CardDescription className="text-muted-foreground">{message}</CardDescription>
                </CardHeader>
                {renderAction() && (
                    <CardFooter>{renderAction()}</CardFooter>
                )}
            </Card>
        </div>
    );
}