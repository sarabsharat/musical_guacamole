// components/auth/SignupForm.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { registerUser } from "@/actions/AuthActions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";

interface SignupFormProps {
    role: "restaurant_owner" | "nutritionist_auditor" | "jfda_officer";
}

export function SignupForm({ role }: SignupFormProps) {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const getRedirectPath = () => {
        switch (role) {
            case "restaurant_owner":
                return "/onboarding/owner";
            case "nutritionist_auditor":
                return "/onboarding/auditor";
            case "jfda_officer":
                return "/jfda/dashboard";
            default:
                return "/dashboard";
        }
    };

    const getTitle = () => {
        switch (role) {
            case "restaurant_owner":
                return "Restaurant Owner Registration";
            case "nutritionist_auditor":
                return "Auditor Registration";
            case "jfda_officer":
                return "JFDA Officer Registration";
            default:
                return "Sign Up";
        }
    };

    const getDescription = () => {
        switch (role) {
            case "restaurant_owner":
                return "Create your restaurant account";
            case "nutritionist_auditor":
                return "Independent Review Access";
            case "jfda_officer":
                return "JFDA Internal System Access";
            default:
                return "";
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        if (password !== confirmPassword) {
            setError("Passwords do not match!");
            setIsLoading(false);
            return;
        }

        const res = await registerUser({
            email,
            phone_number: phoneNumber, // ✅ always a string (required)
            password,
            full_name: fullName,
            role,
        });

        if (res.success) {
            const loginRes = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (loginRes?.ok) {
                router.push(getRedirectPath());
                router.refresh();
            } else {
                setError("Registration succeeded. Please log in manually.");
                setIsLoading(false);
            }
        } else {
            setError(res.message);
            setIsLoading(false);
        }
    };

    return (
        <Card className="mx-auto w-full max-w-md">
            <CardHeader className="relative">
                <Link href="/signup" className="absolute top-4 left-4 text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
                <CardTitle className="text-center pt-4">{getTitle()}</CardTitle>
                <CardDescription className="text-center">{getDescription()}</CardDescription>
            </CardHeader>
            <CardContent>
                {error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                <form onSubmit={handleSubmit} className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="full-name">Full Name</Label>
                        <Input
                            id="full-name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="phone-number">Phone Number</Label>
                        <Input
                            id="phone-number"
                            type="tel"
                            placeholder="07X XXX XXXX"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            required // ✅ now required
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <Input
                            id="confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Account
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}