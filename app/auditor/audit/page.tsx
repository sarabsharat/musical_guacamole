// app/auditor/audit/page.tsx
import React from "react";
import { requireAuditorAuth } from "@/lib/Authentication/RequireAuditorAuth";
import { VerificationBanner } from "@/components/auditor/verification-banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ClipboardCheck } from "lucide-react";
import { getRestaurantsNeedingAudit } from "@/actions/auditor/data/data";

// Define the expected shape of the restaurant data
type RestaurantData = {
    id: number;
    business_name: string;
    cert_level: string;
    cert_status: string;
    _count: {
        recipes: number;
    };
};

export default async function AuditorAuditPage() {
    const { verificationStatus } = await requireAuditorAuth();

    const result = await getRestaurantsNeedingAudit();
    const restaurants = result.success ? (result.data as RestaurantData[] ?? []) : [];

    return (
        <div className="flex flex-col gap-6 px-4 lg:px-6 py-4">
            <div className="border-b border-border pb-4">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Site Inspections</h1>
                <p className="text-base text-muted-foreground mt-1">Restaurants requiring physical audit (Level 2/3)</p>
            </div>

            <VerificationBanner verificationStatus={verificationStatus} />

            <Card>
                <CardHeader>
                    <CardTitle>Restaurants</CardTitle>
                </CardHeader>
                <CardContent>
                    {!result.success ? (
                        <div className="py-8 text-center text-muted-foreground">{result.message}</div>
                    ) : restaurants.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">No restaurants need a physical audit at this time.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Business Name</TableHead>
                                    <TableHead>Current Level</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Approved Recipes</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {restaurants.map((rest: RestaurantData) => (
                                    <TableRow key={rest.id}>
                                        <TableCell className="font-medium">{rest.business_name}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">Level {rest.cert_level.replace("LEVEL_", "")}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={rest.cert_status === "ACTIVE" ? "default" : "secondary"}>
                                                {rest.cert_status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{rest._count.recipes} approved</TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/auditor/audit/${rest.id}`}>
                                                <Button variant="secondary" size="sm" className="gap-2">
                                                    <ClipboardCheck className="h-4 w-4" /> Inspect
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}