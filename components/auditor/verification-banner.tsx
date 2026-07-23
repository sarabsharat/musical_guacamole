"use client";

import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { refreshMyStatus } from "@/actions/AuthActions";
import { useSession } from "next-auth/react";

interface VerificationBannerProps {
    verificationStatus?: string | null;
}

export function VerificationBanner({ verificationStatus }: VerificationBannerProps) {
    const { update } = useSession();
    const [isRefreshing, setIsRefreshing] = React.useState(false);

    const isPending = verificationStatus === "PENDING" || verificationStatus === "UNVERIFIED";

    if (!isPending) return null;

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            const result = await refreshMyStatus();
            if (result.success) {
                await update();
                window.location.reload();
            }
        } catch (error) {
            console.error("Failed to refresh status:", error);
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <div className="rounded-xl border border-carbs/30 bg-carbs/10 p-5 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-carbs/20 p-2 text-carbs">
                        <AlertCircle className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">
                            Account Pending Verification
                        </h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            You cannot perform audits until a platform admin verifies your account.
                            <br className="hidden sm:inline" />
                            <span className="text-xs text-muted-foreground/70">
                                Refresh after admin approval.
                            </span>
                        </p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="shrink-0 gap-2 border-carbs/30 text-foreground hover:bg-carbs/10 hover:border-carbs/50"
                >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    {isRefreshing ? "Checking..." : "Check Status"}
                </Button>
            </div>
        </div>
    );
}