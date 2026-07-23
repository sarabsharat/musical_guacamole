"use client";

import React, { useState } from "react";
import { signOut } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { User, Store, Globe, Lock, Mail, Phone, Pencil, LogOut, ShieldCheck, FileCheck } from "lucide-react";

export interface ProfileData {
    fullName: string;
    email: string;
    phone: string;
    businessName: string;
    level?: number;
    status: "PENDING" | "APPROVED" | "REJECTED" | "ACTIVE" | "INACTIVE";
    language: string;
    role?: string;
    verificationStatus?: string;
    certificationUrl?: string | null;
    certId?: string | null;
}

export function ProfileView({ profile }: { profile: ProfileData }) {
    const [editing, setEditing] = useState(false);
    const isAuditor = profile.role === "nutritionist_auditor";

    // ─── Status helpers ──────────────────────────────────────────────
    const statusColor =
        profile.status === "ACTIVE" || profile.status === "APPROVED"
            ? "var(--protein)"
            : profile.status === "PENDING"
                ? "var(--carbs)"
                : "var(--fats)";

    const getStatusBadge = () => {
        const statusMap: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
            "PENDING": { label: "Pending Review", variant: "secondary" },
            "APPROVED": { label: "Verified", variant: "default" },
            "REJECTED": { label: "Rejected", variant: "destructive" },
            "ACTIVE": { label: "Active", variant: "default" },
            "INACTIVE": { label: "Inactive", variant: "outline" },
        };
        return statusMap[profile.status] || { label: profile.status, variant: "secondary" };
    };

    const getVerificationStatusBadge = () => {
        const statusMap: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
            "UNVERIFIED": { label: "Not Submitted", variant: "outline" },
            "PENDING": { label: "Pending Review", variant: "secondary" },
            "VERIFIED": { label: "Approved", variant: "default" },
            "REJECTED": { label: "Rejected", variant: "destructive" },
        };
        return statusMap[profile.verificationStatus || "UNVERIFIED"] || { label: "Unknown", variant: "secondary" };
    };

    const status = getStatusBadge();
    const verificationStatus = getVerificationStatusBadge();

    return (
        <div className="flex flex-col gap-6 px-4 lg:px-6 py-4 max-w-4xl mx-auto">
            {/* ─── PROFILE HEADER ─────────────────────────────────────── */}
            <Card>
                <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 border border-border">
                            <AvatarImage src="" alt={profile.fullName} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                                {profile.fullName
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h1 className="text-xl font-semibold text-foreground">{profile.fullName}</h1>
                            <p className="text-sm text-muted-foreground">{profile.email}</p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {!isAuditor && (
                                    <Badge variant="outline" className="text-xs">
                                        Level {profile.level}
                                    </Badge>
                                )}
                                {isAuditor && profile.verificationStatus && (
                                    <Badge variant={verificationStatus.variant} className="text-xs">
                                        {verificationStatus.label}
                                    </Badge>
                                )}
                                <Badge
                                    className="text-xs border"
                                    style={{
                                        color: statusColor,
                                        borderColor: `color-mix(in srgb, ${statusColor} 30%, transparent)`,
                                        backgroundColor: `color-mix(in srgb, ${statusColor} 10%, transparent)`,
                                    }}
                                >
                                    {isAuditor ? "Auditor" : profile.status.charAt(0) + profile.status.slice(1).toLowerCase()}
                                </Badge>
                            </div>
                        </div>
                    </div>
                    <Button
                        variant={editing ? "secondary" : "default"}
                        onClick={() => setEditing((e) => !e)}
                        className="gap-2 cursor-pointer"
                    >
                        <Pencil className="h-4 w-4" />
                        {editing ? "Cancel" : "Edit profile"}
                    </Button>
                </CardContent>
            </Card>

            {/* ─── TABS ───────────────────────────────────────────────── */}
            <Tabs defaultValue="personal" className="w-full">
                <TabsList className="grid grid-cols-4 w-full sm:w-fit">
                    <TabsTrigger value="personal" className="gap-2 cursor-pointer">
                        <User className="h-4 w-4" /> <span className="hidden sm:inline">Personal</span>
                    </TabsTrigger>
                    <TabsTrigger value="business" className="gap-2 cursor-pointer">
                        <Store className="h-4 w-4" /> <span className="hidden sm:inline">Business</span>
                    </TabsTrigger>
                    {isAuditor && (
                        <TabsTrigger value="verification" className="gap-2 cursor-pointer">
                            <ShieldCheck className="h-4 w-4" /> <span className="hidden sm:inline">Verification</span>
                        </TabsTrigger>
                    )}
                    <TabsTrigger value="preferences" className="gap-2 cursor-pointer">
                        <Globe className="h-4 w-4" /> <span className="hidden sm:inline">Preferences</span>
                    </TabsTrigger>
                    <TabsTrigger value="security" className="gap-2 cursor-pointer">
                        <Lock className="h-4 w-4" /> <span className="hidden sm:inline">Security</span>
                    </TabsTrigger>
                </TabsList>

                {/* ─── Personal info ─────────────────────────────────── */}
                <TabsContent value="personal" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Personal information</CardTitle>
                            <CardDescription>Your name and contact details</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-5 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="fullName">Full name</Label>
                                <Input id="fullName" defaultValue={profile.fullName} disabled={!editing} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="email" className="flex items-center gap-1.5">
                                    <Mail className="h-3.5 w-3.5" /> Email
                                </Label>
                                <Input id="email" type="email" defaultValue={profile.email} disabled={!editing} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="phone" className="flex items-center gap-1.5">
                                    <Phone className="h-3.5 w-3.5" /> Phone
                                </Label>
                                <Input id="phone" type="tel" defaultValue={profile.phone} disabled={!editing} />
                            </div>
                            {editing && (
                                <div className="sm:col-span-2 flex justify-end pt-2">
                                    <Button onClick={() => setEditing(false)}>Save changes</Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ─── Business info ─────────────────────────────────── */}
                <TabsContent value="business" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Business details</CardTitle>
                            <CardDescription>
                                {isAuditor ? "Professional information" : "Information tied to your restaurant account"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-5 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="businessName">{isAuditor ? "Organization" : "Business name"}</Label>
                                <Input id="businessName" defaultValue={profile.businessName} disabled={!editing} />
                            </div>
                            {!isAuditor ? (
                                <>
                                    <div className="space-y-1.5">
                                        <Label>Account level</Label>
                                        <div className="flex items-center h-9">
                                            <Badge variant="outline">Level {profile.level}</Badge>
                                        </div>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <Separator className="my-1" />
                                    </div>
                                    <div className="space-y-1.5 sm:col-span-2">
                                        <Label>Account status</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Your account is currently{" "}
                                            <span style={{ color: statusColor }} className="font-medium">
                                                {profile.status.toLowerCase()}
                                            </span>
                                            . Contact support if this doesn't look right.
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div className="sm:col-span-2 space-y-1.5">
                                    <Label>Role</Label>
                                    <p className="text-sm text-muted-foreground">
                                        <Badge variant="outline" className="capitalize">
                                            {profile.role?.replace("_", " ") || "Auditor"}
                                        </Badge>
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ─── Verification (Auditor only) ───────────────────── */}
                {isAuditor && (
                    <TabsContent value="verification" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ShieldCheck className="h-5 w-5 text-primary" />
                                    Auditor Verification
                                </CardTitle>
                                <CardDescription>
                                    Your certification status and documents
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-5">
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label>Verification Status</Label>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={verificationStatus.variant} className="text-sm px-3 py-1">
                                                {verificationStatus.label}
                                            </Badge>
                                            {profile.verificationStatus === "PENDING" && (
                                                <span className="text-xs text-amber-600">
                                                    Awaiting admin approval
                                                </span>
                                            )}
                                            {profile.verificationStatus === "VERIFIED" && (
                                                <span className="text-xs text-green-600">
                                                    ✓ Verified
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {profile.certId && (
                                        <div className="space-y-1.5">
                                            <Label>Certification ID</Label>
                                            <p className="text-sm font-medium bg-muted/50 px-3 py-2 rounded-md border">
                                                {profile.certId}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {profile.certificationUrl && (
                                    <div className="space-y-1.5">
                                        <Label>Certification Document</Label>
                                        <a
                                            href={profile.certificationUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-primary hover:underline text-sm font-medium"
                                        >
                                            <FileCheck className="h-4 w-4" />
                                            View Certification Document
                                        </a>
                                    </div>
                                )}

                                {!profile.certificationUrl && profile.verificationStatus === "UNVERIFIED" && (
                                    <div className="bg-muted/30 p-4 rounded-lg border border-dashed text-center">
                                        <p className="text-sm text-muted-foreground">
                                            No certification document uploaded yet.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                {/* ─── Preferences ────────────────────────────────────── */}
                <TabsContent value="preferences" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Preferences</CardTitle>
                            <CardDescription>Language and display settings</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-5 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label>Language</Label>
                                <div className="flex gap-2">
                                    <Button variant={profile.language === "en" ? "default" : "outline"} size="sm" className="cursor-pointer">
                                        English
                                    </Button>
                                    <Button variant={profile.language === "ar" ? "default" : "outline"} size="sm" className="cursor-pointer">
                                        العربية
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ─── Security ───────────────────────────────────────── */}
                <TabsContent value="security" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Security</CardTitle>
                            <CardDescription>Manage your password and session</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-5 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="currentPassword">Current password</Label>
                                <Input id="currentPassword" type="password" placeholder="••••••••" />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="newPassword">New password</Label>
                                <Input id="newPassword" type="password" placeholder="••••••••" />
                            </div>
                            <div className="sm:col-span-2 flex justify-between items-center pt-2">
                                <Button className="cursor-pointer">Update password</Button>
                                <Button
                                    variant="outline"
                                    className="gap-2 cursor-pointer"
                                    style={{ color: "var(--fats)", borderColor: "color-mix(in srgb, var(--fats) 30%, transparent)" }}
                                    onClick={() => signOut({ callbackUrl: "/login" })}
                                >
                                    <LogOut className="h-4 w-4" />
                                    Log out
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}