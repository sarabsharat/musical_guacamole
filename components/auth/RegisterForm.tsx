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
import { registerUser } from "@/actions/AuthActions";

export function RegisterForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      const result = await registerUser({ email, password, confirmPassword });
      if (!result.success) {
        setError(result.message);
        return;
      }

      // Auto‑login after registration
      const loginResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (loginResult?.error) {
        setError(loginResult.error);
        return;
      }

      // Refresh to let middleware redirect to onboarding
      router.refresh();
    });
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>
            Enter your details below to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} method={"post"}>
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
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  disabled={isPending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
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
                  {isPending ? "Creating account..." : "Create account"}
                </Button>
                <FieldDescription className="text-center">
                  Already have an account?{" "}
                  <a href="/login" className="hover:underline">
                    Login
                  </a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}