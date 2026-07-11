"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LoginForm({
                              className,
                              ...props
                          }: React.ComponentProps<"div">) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);

        const formData = new FormData(e.currentTarget);
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        if (!email || !password) {
            setError("Email and password are required.");
            return;
        }

        startTransition(async () => {
            try {
                const result = await signIn("credentials", {
                    email,
                    password,
                    redirect: false,
                });

                if (result?.error) {
                    setError(result.error);
                    return;
                }

                router.push("/dashboard");
            } catch (err) {
                setError("An unexpected error occurred.");
                console.error(err);
            }
        });
    };

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle>Login to your account</CardTitle>
                    <CardDescription>
                        Enter your email below to login to your account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="email">Email</FieldLabel>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="m@example.com"
                                    required
                                    disabled={isPending}
                                />
                            </Field>
                            <Field>
                                <div className="flex items-center">
                                    <FieldLabel htmlFor="password">Password</FieldLabel>
                                    <a
                                        href="//forgot-password"
                                        className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                                    >
                                        Forgot your password?
                                    </a>
                                </div>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    disabled={isPending}
                                />
                            </Field>
                            {error && (
                                <div className="text-sm text-red-600 font-medium">{error}</div>
                            )}
                            <Field>
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? "Logging in..." : "Login"}
                                </Button>
                                <Button
                                    variant="outline"
                                    type="button"
                                    onClick={() => signIn("google", { callbackUrl: "/" })}
                                    disabled={isPending}
                                >
                                    Login with Google
                                </Button>
                                <FieldDescription className="text-center">
                                    Don&apos;t have an account? <a href="/register">Sign up</a>
                                </FieldDescription>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}