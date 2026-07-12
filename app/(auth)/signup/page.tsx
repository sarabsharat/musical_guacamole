"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { registerUser } from "@/actions/AuthActions";
import { Role } from "@prisma/client";

export default function SignupPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [role, setRole] = useState<Role>("restaurant_owner");
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            return setError("Passwords do not match!");
        }

        const res = await registerUser({ email, password, full_name: fullName, role });

        if (res.success) {
            // Auto-login after successful registration
            const loginRes = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });
            if (loginRes?.ok) {
                window.location.href = "/onboarding";
            }
        } else {
            setError(res.message);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-black p-4">
            <div className="w-full max-w-md p-8 bg-white rounded shadow-md border">
                <h1 className="text-2xl font-bold mb-6 text-center">Create an Account</h1>

                {error && <div className="p-3 mb-4 text-sm text-red-500 bg-red-100 rounded">{error}</div>}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full Name" className="p-2 border rounded" required />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="p-2 border rounded" required />

                    <select value={role} onChange={e => setRole(e.target.value as Role)} className="p-2 border rounded bg-white">
                        <option value="restaurant_owner">Restaurant Owner</option>
                        <option value="jfda_officer">JFDA Officer</option>
                        <option value="auditor">Auditor</option>
                    </select>

                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="p-2 border rounded" required />
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm Password" className="p-2 border rounded" required />

                    <button type="submit" className="p-3 bg-blue-600 text-white rounded font-bold hover:bg-blue-700">Sign Up</button>
                </form>

                <div className="my-6 border-t relative">
                    <span className="absolute top-[-12px] left-1/2 transform -translate-x-1/2 bg-white px-2 text-gray-500 text-sm">OR</span>
                </div>

                <button
                    onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
                    className="w-full p-3 border rounded font-bold hover:bg-gray-50 flex justify-center items-center gap-2"
                >
                    Sign up with Google
                </button>
            </div>
        </div>
    );
}