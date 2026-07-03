// src/components/shared/logout-button.tsx
"use client";

import React from "react";
import { signOut } from "next-auth/react";

export function LogoutButton() {
    return (
        <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="border-2 border-black bg-white hover:bg-black hover:text-white px-3 py-1 font-mono text-xs font-bold uppercase rounded-none transition cursor-pointer"
        >
            Logout
        </button>
    );
}