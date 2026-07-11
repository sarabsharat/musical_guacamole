import React from "react";
import { requireJfdaAuth } from "@/lib/RequireJfdaAuth";
import { LogoutButton } from "@/components/ui/logout-button";

// Shadcn UI & Icons
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, User, Mail } from "lucide-react";

export default async function DashboardPage() {
    const { currentUser } = await requireJfdaAuth();

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">


            {/* Profile Card */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                            <span className="font-medium">{currentUser.full_name}</span>
                        </div>
                        <div className="flex items-center space-x-3 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{currentUser.email}</span>
                        </div>

                    </CardContent>
                </Card>
            </div>
        </div>
    );
}