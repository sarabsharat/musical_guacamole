// src/app/auth/login/page.tsx
"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError("Invalid email or password. Verify your seed credentials.");
            } else {
                // Navigate to the intermediate redirection resolver page
                router.push("/auth/success");
            }
        } catch (err: any) {
            setError("Authentication connection failure.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-100 p-4 font-mono text-black">
            <form
                onSubmit={handleSubmit}
                className="border-4 border-black p-6 bg-white max-w-md w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4"
            >
                <div className="border-b-2 border-black pb-2">
                    <span className="bg-red-500 text-white px-2 py-0.5 text-[10px] font-bold uppercase rounded-none border border-black">
                        SECURE CONTROL PANEL
                    </span>
                    <h1 className="text-2xl font-extrabold uppercase mt-2">Sign In</h1>
                </div>

                {error && (
                    <div className="border-2 border-red-600 bg-red-50 p-3 text-xs uppercase text-red-700 font-bold rounded-none">
                        {error}
                    </div>
                )}

                <div className="space-y-1">
                    <label className="block text-xs uppercase font-bold">Email Address</label>
                    <input
                        required
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="leen@dumplings.com"
                        className="w-full border-2 border-black p-2 text-xs rounded-none bg-white focus:outline-none"
                    />
                </div>

                <div className="space-y-1">
                    <label className="block text-xs uppercase font-bold">Password</label>
                    <input
                        required
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••"
                        className="w-full border-2 border-black p-2 text-xs rounded-none bg-white focus:outline-none"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-black text-white py-3 text-xs font-bold uppercase border-2 border-black rounded-none cursor-pointer hover:bg-neutral-800 transition disabled:opacity-45"
                >
                    {loading ? "Authenticating..." : "Establish Secure Session"}
                </button>
            </form>
        </div>
    );
}