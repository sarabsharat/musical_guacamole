// app/auditor/dashboard/page.tsx
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, User, Mail, ClipboardList } from "lucide-react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AuditorDashboardPage() {
    const session = await auth();

    if (!session || session.user.role !== "nutritionist_auditor") {
        redirect("/login");
    }

    const user = session.user;
    const fullName = user.name || "Auditor";
    const email = user.email || "";

    return (
        <div className="p-6 md:p-8 space-y-6">
            <div className="border-b border-border pb-4">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Auditor Dashboard</h1>
                <p className="text-base text-muted-foreground mt-1">
                    Welcome to the Nutritionist Auditor portal
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Profile Card */}
                <Card>
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                        <div className="space-y-1">
                            <CardTitle className="text-base font-semibold">Profile Information</CardTitle>
                            <CardDescription>Your current active session</CardDescription>
                        </div>
                        <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <div className="flex items-center space-x-3 text-sm">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{fullName}</span>
                        </div>
                        <div className="flex items-center space-x-3 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{email}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Stats Card – example */}
                <Card>
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                        <div className="space-y-1">
                            <CardTitle className="text-base font-semibold">Pending Reviews</CardTitle>
                            <CardDescription>Recipes waiting for your approval</CardDescription>
                        </div>
                        <ClipboardList className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">12</p>
                        <p className="text-xs text-muted-foreground">+2 since last week</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}