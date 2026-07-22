// components/auth/onboarding-auditor-form.tsx
"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, FileCheck, LogOut } from "lucide-react";
import { DragDropUploader } from "@/components/owner/drag-drop-uploader";
import { updateAuditorProfile } from "@/actions/OnboardingActions";

export function OnboardingAuditorForm() {
    const { data: session, status, update } = useSession();
    const router = useRouter();
    const [certificationUrl, setCertificationUrl] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const isAuditor = session?.user?.role === "nutritionist_auditor";

    if (status === "loading") {
        return (
            <Card className="mx-auto w-full max-w-md">
                <CardContent className="pt-6 text-center text-muted-foreground">
                    Loading your profile...
                </CardContent>
            </Card>
        );
    }

    if (session?.user?.verification_status === "VERIFIED") {
        router.push("/auditor/dashboard");
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        if (!certificationUrl) {
            setError("Please upload your certification document.");
            setIsLoading(false);
            return;
        }

        try {
            const res = await updateAuditorProfile({
                certification_url: certificationUrl,
            });

            if (res.success) {
                await update({
                    user: {
                        ...session?.user,
                        verification_status: "PENDING",
                    }
                });
                setSubmitted(true);
                setIsLoading(false);
            } else {
                setError(res.message || "Failed to update profile.");
                setIsLoading(false);
            }
        } catch (err) {
            console.error("Auditor onboarding error:", err);
            setError("An error occurred. Please try again.");
            setIsLoading(false);
        }
    };

    // ─── Success state ──────────────────────────────────────────────
    if (submitted) {
        return (
            <Card className="mx-auto w-full max-w-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary">
                        <FileCheck className="h-6 w-6" />
                        Application Submitted
                    </CardTitle>
                    <CardDescription>
                        Your auditor application has been submitted and is pending review.
                        You will be notified once your account is verified.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert className="border-accent bg-accent/10 text-accent-foreground">
                        <AlertCircle className="h-4 w-4 text-accent-foreground" />
                        <AlertDescription>
                            Your application is pending review. You'll be notified once verified.
                        </AlertDescription>
                    </Alert>
                    <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => signOut({ callbackUrl: "/login" })}
                    >
                        <LogOut className="h-4 w-4" />
                        Logout & Return to Login
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="mx-auto w-full max-w-2xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileCheck className="h-6 w-6 text-primary" />
                    Auditor Verification
                </CardTitle>
                <CardDescription>
                    Please upload your certification document to complete your registration.
                    Your application will be reviewed by the platform admin.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <form onSubmit={handleSubmit} className="grid gap-6">
                    <div className="grid gap-2">
                        <Label className="font-semibold">
                            Upload Certification Document *
                        </Label>
                        <DragDropUploader
                            onUploadSuccess={(url) => {
                                setCertificationUrl(url);
                                setError("");
                            }}
                            onUploadError={(err) => setError("Upload failed: " + err)}
                            onUploadStart={() => console.log("Upload started")}
                            context="onboarding"
                        />
                        {certificationUrl && (
                            <p className="text-xs text-primary flex items-center gap-1">
                                <span className="inline-block h-2 w-2 rounded-full bg-mint" />
                                File uploaded successfully.
                            </p>
                        )}
                    </div>

                    {session?.user?.verification_status === "PENDING" && (
                        <Alert className="border-accent bg-accent/10 text-accent-foreground">
                            <AlertCircle className="h-4 w-4 text-accent-foreground" />
                            <AlertDescription>
                                Your application is pending review. You'll be notified once verified.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* ─── Submit button: enabled only when file is uploaded ─── */}
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading || !isAuditor || !certificationUrl}
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {session?.user?.verification_status === "PENDING"
                            ? "Resubmit for Review"
                            : "Submit for Review"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}