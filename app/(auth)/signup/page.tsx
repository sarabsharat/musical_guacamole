"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Store, ShieldCheck, ClipboardCheck } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { setGoogleUserRole } from "@/app/(auth)/signup/action";

export default function SignupHubPage() {
    const { data: session, status, update } = useSession();
    const router = useRouter();

    const handleRoleClick = async (role: string, defaultPath: string, redirectPath: string) => {
        if (status === "loading") return;

        // If user already has a role, redirect them directly
        if (session?.user?.role) {
            router.push(redirectPath);
            return;
        }

        // If logged in (Google user) without role: assign role
        if (session?.user) {
            try {
                // Set role in database
                await setGoogleUserRole(role);
                // Update session cookie
                await update({ user: { ...session.user, role } });
                // Force a refresh to make sure middleware sees the new role
                router.push(redirectPath);
                router.refresh();
            } catch (error) {
                console.error("Failed to set role:", error);
                // Fallback to signup form
                router.push(defaultPath);
            }
        } else {
            // Not logged in → go to email/password signup form
            router.push(defaultPath);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
            <div className="mx-auto w-full max-w-3xl space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Join the Platform</h1>
                    <p className="text-muted-foreground">Select how you want to use the system</p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {/* Owner */}
                    <div
                        onClick={() => handleRoleClick("restaurant_owner", "/signup/owner", "/onboarding")}
                        className="transition-transform hover:scale-105"
                    >
                        <Card className="h-full cursor-pointer hover:border-primary">
                            <CardHeader className="text-center">
                                <div className="mx-auto mb-4 rounded-full bg-primary/10 p-4">
                                    <Store className="h-8 w-8 text-primary" />
                                </div>
                                <CardTitle className="text-xl">Restaurant Owner</CardTitle>
                                <CardDescription>Register your business and manage your recipes.</CardDescription>
                            </CardHeader>
                        </Card>
                    </div>

                    {/* JFDA Officer */}
                    <div
                        onClick={() => handleRoleClick("jfda_officer", "/signup/jfda", "/jfda/dashboard")}
                        className="transition-transform hover:scale-105"
                    >
                        <Card className="h-full cursor-pointer hover:border-primary">
                            <CardHeader className="text-center">
                                <div className="mx-auto mb-4 rounded-full bg-blue-500/10 p-4">
                                    <ShieldCheck className="h-8 w-8 text-blue-500" />
                                </div>
                                <CardTitle className="text-xl">JFDA Officer</CardTitle>
                                <CardDescription>Access regulatory tools and compliance dashboards.</CardDescription>
                            </CardHeader>
                        </Card>
                    </div>

                    {/* Auditor */}
                    <div
                        onClick={() => handleRoleClick("nutritionist_auditor", "/signup/auditor", "/auditor/dashboard")}
                        className="transition-transform hover:scale-105"
                    >
                        <Card className="h-full cursor-pointer hover:border-primary">
                            <CardHeader className="text-center">
                                <div className="mx-auto mb-4 rounded-full bg-green-500/10 p-4">
                                    <ClipboardCheck className="h-8 w-8 text-green-500" />
                                </div>
                                <CardTitle className="text-xl">Auditor</CardTitle>
                                <CardDescription>Review submissions and verify nutritional data.</CardDescription>
                            </CardHeader>
                        </Card>
                    </div>
                </div>

                {!session && status !== "loading" && (
                    <div className="text-center text-sm text-muted-foreground">
                        Already have an account?{" "}
                        <Link href="/login" className="font-medium text-primary hover:underline">
                            Log in here
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}