// import Link from "next/link";
// import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
// import { Store, ShieldCheck, ClipboardCheck } from "lucide-react";
//
// export default function SignupHubPage() {
//     return (
//         <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
//             <div className="mx-auto w-full max-w-3xl space-y-8">
//                 <div className="text-center space-y-2">
//                     <h1 className="text-3xl font-bold tracking-tight">Join the Platform</h1>
//                     <p className="text-muted-foreground">Select how you want to use the system</p>
//                 </div>
//
//                 <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
//                     {/* Owner Route */}
//                     <Link href="/signup/owner" className="transition-transform hover:scale-105">
//                         <Card className="h-full cursor-pointer hover:border-primary">
//                             <CardHeader className="text-center">
//                                 <div className="mx-auto mb-4 rounded-full bg-primary/10 p-4">
//                                     <Store className="h-8 w-8 text-primary" />
//                                 </div>
//                                 <CardTitle className="text-xl">Restaurant Owner</CardTitle>
//                                 <CardDescription>Register your business and manage your recipes.</CardDescription>
//                             </CardHeader>
//                         </Card>
//                     </Link>
//
//                     {/* Officer Route */}
//                     <Link href="/signup/jfda" className="transition-transform hover:scale-105">
//                         <Card className="h-full cursor-pointer hover:border-primary">
//                             <CardHeader className="text-center">
//                                 <div className="mx-auto mb-4 rounded-full bg-blue-500/10 p-4">
//                                     <ShieldCheck className="h-8 w-8 text-blue-500" />
//                                 </div>
//                                 <CardTitle className="text-xl">JFDA Officer</CardTitle>
//                                 <CardDescription>Access regulatory tools and compliance dashboards.</CardDescription>
//                             </CardHeader>
//                         </Card>
//                     </Link>
//
//                     {/* Auditor Route */}
//                     <Link href="/signup/auditor" className="transition-transform hover:scale-105">
//                         <Card className="h-full cursor-pointer hover:border-primary">
//                             <CardHeader className="text-center">
//                                 <div className="mx-auto mb-4 rounded-full bg-green-500/10 p-4">
//                                     <ClipboardCheck className="h-8 w-8 text-green-500" />
//                                 </div>
//                                 <CardTitle className="text-xl">Auditor</CardTitle>
//                                 <CardDescription>Review submissions and verify nutritional data.</CardDescription>
//                             </CardHeader>
//                         </Card>
//                     </Link>
//                 </div>
//
//                 <div className="text-center text-sm text-muted-foreground">
//                     Already have an account?{" "}
//                     <Link href="/login" className="font-medium text-primary hover:underline">
//                         Log in here
//                     </Link>
//                 </div>
//             </div>
//         </div>
//     );
// }

// app/signup/page.tsx
"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Store, ShieldCheck, ClipboardCheck } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {setGoogleUserRole} from "@/app/(auth)/signup/action";


export default function SignupHubPage() {
    // Bring in update() to refresh the cookie without requiring a page reload
    const { data: session, update } = useSession();
    const router = useRouter();

    const handleRoleClick = async (role: string, defaultPath: string, redirectPath: string) => {
        // 1️⃣ IF LOGGED IN (Google User): Assign role and fast-track them
        if (session) {
            await setGoogleUserRole(role);
            // Update the NextAuth cookie on the client so the onboarding form grants access
            await update({ user: { ...session.user, role } });
            window.location.href = redirectPath;
        }
        // 2️⃣ IF NOT LOGGED IN (Normal User): Send to the email/password form
        else {
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
                    {/* Owner Route */}
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

                    {/* Officer Route */}
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

                    {/* Auditor Route */}
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

                {/* Hide the login text if they are already logged in via Google */}
                {!session && (
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