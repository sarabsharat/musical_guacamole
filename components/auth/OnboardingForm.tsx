"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Role } from "@prisma/client";
import { completeOnboarding } from "@/actions/OnboardingActions";

type OnboardingFormData = {
    role: Role;
    full_name: string;
    phone_number: string;
    business_name?: string;
    address_line?: string;
    slug?: string;
};

export function OnboardingForm({ className, ...props }: React.ComponentProps<"div">) {
    const router = useRouter();
    const { update } = useSession(); // 👈 get session updater
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const [role, setRole] = useState<Role>(Role.restaurant_owner);
    const isOwner = role === Role.restaurant_owner;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);

        const formData = new FormData(e.currentTarget);
        const getValue = (name: string) => formData.get(name) as string | null;

        const payload: OnboardingFormData = {
            role,
            full_name: getValue("full_name") || "",
            phone_number: getValue("phone_number") || "",
        };

        if (isOwner) {
            payload.business_name = getValue("business_name") || "";
            payload.address_line = getValue("address_line") || "";
            payload.slug = getValue("slug") || "";
        }

        startTransition(async () => {
            const result = await completeOnboarding(payload);
            if (!result.success) {
                setError(result.message);
                return;
            }

            // 👇 Force session to update with new role and slug
            await update();

            // Now redirect
            if (result.message.includes("pending admin approval")) {
                router.push("/pending-verification");
            } else if (isOwner && payload.slug) {
                // Redirect to tenant subdomain dashboard
                router.push(`http://${payload.slug}.localhost:3000/dashboard`);
            } else {
                router.refresh();
            }
        });
    };

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle>Complete your profile</CardTitle>
                    <CardDescription>Tell us about yourself and your role</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="role">Role</FieldLabel>
                                <Select
                                    value={role}
                                    onValueChange={(value) => setRole(value as Role)}
                                    disabled={isPending}
                                >
                                    <SelectTrigger id="role">
                                        <SelectValue placeholder="Select your role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={Role.restaurant_owner}>
                                            Restaurant Owner
                                        </SelectItem>
                                        <SelectItem value={Role.nutritionist_auditor}>
                                            Nutritionist Auditor
                                        </SelectItem>
                                        <SelectItem value={Role.jfda_officer}>
                                            JFDA Officer
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="full_name">Full Name</FieldLabel>
                                <Input
                                    id="full_name"
                                    name="full_name"
                                    type="text"
                                    placeholder="John Doe"
                                    required
                                    disabled={isPending}
                                />
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="phone_number">Phone Number</FieldLabel>
                                <Input
                                    id="phone_number"
                                    name="phone_number"
                                    type="tel"
                                    placeholder="+962 7 1234 5678"
                                    required
                                    disabled={isPending}
                                />
                            </Field>

                            {isOwner && (
                                <>
                                    <Field>
                                        <FieldLabel htmlFor="business_name">Business Name</FieldLabel>
                                        <Input
                                            id="business_name"
                                            name="business_name"
                                            type="text"
                                            placeholder="My Restaurant"
                                            required={isOwner}
                                            disabled={isPending}
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="address_line">Address Line</FieldLabel>
                                        <Input
                                            id="address_line"
                                            name="address_line"
                                            type="text"
                                            placeholder="123 Main St, Amman"
                                            required={isOwner}
                                            disabled={isPending}
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="slug">Custom Subdomain (slug)</FieldLabel>
                                        <Input
                                            id="slug"
                                            name="slug"
                                            type="text"
                                            placeholder="my-restaurant"
                                            required={isOwner}
                                            disabled={isPending}
                                        />
                                        <FieldDescription>
                                            Your restaurant will be available at{" "}
                                            <span className="font-mono text-xs">
                        {`https://your-slug.localhost:3000`}
                      </span>
                                        </FieldDescription>
                                    </Field>
                                </>
                            )}

                            {error && (
                                <div className="text-sm text-red-600 font-medium">{error}</div>
                            )}

                            <Field>
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? "Saving..." : "Complete Setup"}
                                </Button>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}