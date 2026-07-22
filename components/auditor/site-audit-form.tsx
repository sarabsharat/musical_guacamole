// components/auditor/site-audit-form.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { submitPhysicalSiteAudit } from "@/actions/AuditorActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface SiteAuditFormProps {
    restaurant: {
        id: number;
        business_name: string;
        slug: string;
        cert_level: string;
        cert_status: string;
    };
}

export function SiteAuditForm({ restaurant }: SiteAuditFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [hasAllergenZones, setHasAllergenZones] = useState(false);
    const [usesStandardizedRecipes, setUsesStandardizedRecipes] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await submitPhysicalSiteAudit({
                restaurantId: restaurant.id,
                hasDedicatedAllergenZones: hasAllergenZones,
                usesStandardizedRecipes: usesStandardizedRecipes,
            });
            if (res.success) {
                toast.success(res.message);
                router.push("/auditor/audit");
                router.refresh();
            } else {
                toast.error(res.message || "Audit failed.");
            }
        } catch (error) {
            toast.error("An error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Physical Inspection Checklist</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="allergen-zones"
                                checked={hasAllergenZones}
                                onCheckedChange={(c) => setHasAllergenZones(!!c)}
                            />
                            <Label htmlFor="allergen-zones">
                                Dedicated allergen‑free zones / cross‑contamination prevention
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="standardized-recipes"
                                checked={usesStandardizedRecipes}
                                onCheckedChange={(c) => setUsesStandardizedRecipes(!!c)}
                            />
                            <Label htmlFor="standardized-recipes">
                                Standardized recipes with consistent ingredient measurements
                            </Label>
                        </div>
                    </div>

                    <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit Audit Report
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}