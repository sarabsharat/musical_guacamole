// src/components/shared/logout-button.tsx
"use client";

import React, { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function LogoutButton() {
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);

        try {
            // Force the logout to happen at the root domain so it can actually find and kill the cookie
            // Change 'dev-tenant.myapp.test' to your root domain:
            await signOut({
                callbackUrl: "http://myapp.test:3000/login",
                redirect: true // Let NextAuth handle the redirect to the main domain
            });
        } catch (error) {
            console.error("Logout failed", error);
            // Fallback: clear the path manually
            window.location.replace("http://myapp.test:3000/login");
        }
    };

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="text-muted-foreground hover:text-foreground font-medium"
        >
            <LogOut className="mr-2 h-4 w-4" />
            {isLoggingOut ? "Exiting..." : "Logout"}
        </Button>
    );
}