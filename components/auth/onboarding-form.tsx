// src/components/auth/onboarding-form.tsx
"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { createRestaurant } from "@/actions/OnboardingActions";

export function OnboardingForm() {
    const { data: session, status } = useSession();
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [error, setError] = useState("");

    // Maintain the card layout even while loading so the UI doesn't jump
    if (status === "loading") {
        return (
            <div className="w-full max-w-md p-8 bg-white rounded shadow-md border text-center">
                <div className="animate-pulse text-gray-500">Loading your profile...</div>
            </div>
        );
    }

    // Check if the logged-in user is actually an owner
    const isOwner = session?.user?.role === "restaurant_owner";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // ✅ FIX: Pass undefined as the first argument to satisfy the _mockUser parameter
        const res = await createRestaurant(undefined, {
            business_name: name,
            slug,
            address: "",
            phone: ""
        });

        if (res.success) {
            // Force a hard reload so the Proxy recalculates the new subdomain session
            window.location.href = "/dashboard";
        } else {
            setError(res.message);
        }
    };

    return (
        <div className="w-full max-w-md p-8 bg-white rounded shadow-md border">
            <h1 className="text-2xl font-bold mb-2">Welcome!</h1>
            <p className="text-gray-600 mb-6">
                {isOwner ? "Let's set up your restaurant." : "Your account is ready."}
            </p>

            {error && <div className="p-3 mb-4 text-sm text-red-500 bg-red-100 rounded">{error}</div>}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Business Name (e.g. Burger Lab)"
                    className={`p-2 border rounded ${!isOwner ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    disabled={!isOwner}
                    required={isOwner}
                />
                <input
                    value={slug}
                    onChange={e => setSlug(e.target.value)}
                    placeholder="Unique URL Slug (e.g. burger-lab)"
                    className={`p-2 border rounded ${!isOwner ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    disabled={!isOwner}
                    required={isOwner}
                />

                {isOwner ? (
                    <button type="submit" className="p-3 bg-green-600 text-white rounded font-bold mt-2">
                        Create Restaurant
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => window.location.href = "/dashboard"}
                        className="p-3 bg-blue-600 text-white rounded font-bold mt-2"
                    >
                        Continue to Dashboard
                    </button>
                )}
            </form>
        </div>
    );
}