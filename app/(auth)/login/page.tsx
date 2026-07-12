"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        if (result?.ok) {
            // Send them to /dashboard - The Proxy will automatically redirect them to
            // slug.domain.com if they have a restaurant, or trap them at /onboarding if they don't!
            window.location.href = "/dashboard";
        } else {
            setError("Invalid email or password");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-black p-4">
            <div className="w-full max-w-md p-8 bg-white rounded shadow-md border">
                <h1 className="text-2xl font-bold mb-6 text-center">Login to your account</h1>

                {error && <div className="p-3 mb-4 text-sm text-red-500 bg-red-100 rounded">{error}</div>}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="p-2 border rounded" required />
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="p-2 border rounded" required />

                    <button type="submit" className="p-3 bg-blue-600 text-white rounded font-bold">Login</button>
                </form>

                <div className="my-6 border-t relative">
                    <span className="absolute top-[-12px] left-1/2 transform -translate-x-1/2 bg-white px-2 text-gray-500 text-sm">OR</span>
                </div>

                <button
                    onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                    className="w-full p-3 border rounded font-bold hover:bg-gray-50 flex justify-center items-center gap-2"
                >
                    Sign in with Google
                </button>
            </div>
        </div>
    );
}