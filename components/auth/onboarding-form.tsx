// components/auth/onboarding-form.tsx
"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { createRestaurant } from "@/actions/OnboardingActions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import {DragDropUploader} from "@/components/owner/drag-drop-uploader";

const DELIVERY_APPS = ["Careem", "Talabat","My Things", "Other"];

export function OnboardingForm() {
    const { data: session, status } = useSession();
    const [businessName, setBusinessName] = useState("");
    const [slug, setSlug] = useState("");
    const [addressLine, setAddressLine] = useState("");
    const [hasAllergenSeparation, setHasAllergenSeparation] = useState(false);
    const [usesCalorieTracking, setUsesCalorieTracking] = useState(false);
    const [logoUrl, setLogoUrl] = useState("");
    const [bgUrl, setBgUrl] = useState("");
    const [estimatedRecipeCount, setEstimatedRecipeCount] = useState<number | "">("");
    const [selectedDeliveryApps, setSelectedDeliveryApps] = useState<string[]>([]);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const isOwner = session?.user?.role === "restaurant_owner";

    if (status === "loading") {
        return (
            <Card className="mx-auto w-full max-w-md">
                <CardContent className="pt-6 text-center text-muted-foreground">
                    Loading your profile...
                </CardContent>
            </Card>
        );
    }

    const toggleDeliveryApp = (app: string) => {
        setSelectedDeliveryApps((prev) =>
            prev.includes(app) ? prev.filter((a) => a !== app) : [...prev, app]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        const res = await createRestaurant(undefined, {
            business_name: businessName,
            slug,
            address_line: addressLine,
            has_allergen_separation: hasAllergenSeparation,
            uses_calorie_tracking: usesCalorieTracking,
            logo_url: logoUrl || undefined,
            background_image_url: bgUrl || undefined,
            estimated_recipe_count: estimatedRecipeCount || undefined,
            delivery_apps: selectedDeliveryApps,
        });

        if (res.success) {
            window.location.href = "/dashboard";
        } else {
            setError(res.message);
            setIsLoading(false);
        }
    };

    return (
        <Card className="mx-auto w-full max-w-2xl">
            <CardHeader>
                <CardTitle>Welcome! Tell us about your restaurant</CardTitle>
                <CardDescription>This helps us tailor the platform to your needs.</CardDescription>
            </CardHeader>
            <CardContent>
                {error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                <form onSubmit={handleSubmit} className="grid gap-6">
                    {/* Basic Info */}
                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="business-name">Business Name *</Label>
                            <Input
                                id="business-name"
                                value={businessName}
                                onChange={(e) => setBusinessName(e.target.value)}
                                disabled={!isOwner}
                                required={isOwner}
                                placeholder="e.g. Burger Lab"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="slug">Subdomain Slug *</Label>
                            <Input
                                id="slug"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s/g, "-"))}
                                disabled={!isOwner}
                                required={isOwner}
                                placeholder="e.g. burger-lab"
                            />
                            <p className="text-xs text-muted-foreground">
                                Your restaurant will be at: <strong>{slug ? `${slug}.localhost:3000` : "your-slug.localhost:3000"}</strong>
                            </p>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="address">Address</Label>
                            <Textarea
                                id="address"
                                value={addressLine}
                                onChange={(e) => setAddressLine(e.target.value)}
                                disabled={!isOwner}
                                placeholder="Street, city, country"
                                rows={2}
                            />
                        </div>
                    </div>

                    {/* Branding */}
                    <div className="grid gap-4 border-t pt-4">
                        <h3 className="font-semibold">Branding</h3>
                        <div className="grid gap-6 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Logo</Label>
                                <DragDropUploader
                                    onUploadSuccess={(url) => setLogoUrl(url)}
                                    onUploadError={(err) => console.error("Logo upload error:", err)}
                                    onUploadStart={() => console.log("Logo upload started")}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Background Image</Label>
                                <DragDropUploader
                                    onUploadSuccess={(url) => setBgUrl(url)}
                                    onUploadError={(err) => console.error("Background upload error:", err)}
                                    onUploadStart={() => console.log("Background upload started")}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Operations */}
                    <div className="grid gap-4 border-t pt-4">
                        <h3 className="font-semibold">Kitchen & Operations</h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="recipe-count">Estimated number of existing recipes</Label>
                                <Input
                                    id="recipe-count"
                                    type="number"
                                    min={0}
                                    value={estimatedRecipeCount}
                                    onChange={(e) => setEstimatedRecipeCount(e.target.value ? Number(e.target.value) : "")}
                                    placeholder="e.g. 50"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Delivery apps you work with</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {DELIVERY_APPS.map((app) => (
                                        <div key={app} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`app-${app}`}
                                                checked={selectedDeliveryApps.includes(app)}
                                                onCheckedChange={() => toggleDeliveryApp(app)}
                                            />
                                            <Label htmlFor={`app-${app}`} className="text-sm font-normal">
                                                {app}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="allergen-separation"
                                checked={hasAllergenSeparation}
                                onCheckedChange={(checked) => setHasAllergenSeparation(!!checked)}
                            />
                            <Label htmlFor="allergen-separation" className="text-sm font-normal">
                                We have dedicated allergen‑free zones / cross‑contamination prevention
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="calorie-tracking"
                                checked={usesCalorieTracking}
                                onCheckedChange={(checked) => setUsesCalorieTracking(!!checked)}
                            />
                            <Label htmlFor="calorie-tracking" className="text-sm font-normal">
                                We have experience tracking calories / nutrition data
                            </Label>
                        </div>
                    </div>

                    {isOwner ? (
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Complete Onboarding
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            variant="default"
                            className="w-full"
                            onClick={() => (window.location.href = "/dashboard")}
                        >
                            Continue to Dashboard
                        </Button>
                    )}
                </form>
            </CardContent>
        </Card>
    );
}