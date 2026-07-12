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

        // 1. Destroy the session securely
        await signOut({ redirect: false });

        // Use 'replace' instead of 'href' or 'router.push'.
        // This overwrites the current page in the browser's history.
        // If they click the back button, they won't go to the dashboard,
        // they will go to whatever page they were on BEFORE the dashboard.
        window.location.replace("/login");
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