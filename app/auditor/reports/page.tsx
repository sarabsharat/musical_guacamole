// app/auditor/reports/page.tsx
import React from "react";
import { requireAuditorAuth } from "@/lib/Authentication/RequireAuditorAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { VerificationBanner } from "@/components/auditor/verification-banner";
import {generateAuditReport} from "@/actions/auditor/data/data";

interface Log {
    id: number;
    action: string;
    created_at: Date;
    restaurant: { business_name: string } | null;
    actor: { full_name: string | null; email: string } | null;
}

export default async function AuditorReportsPage({
                                                     searchParams,
                                                 }: {
    searchParams: Promise<{ start?: string; end?: string; restaurant?: string; allergen?: string }>;
}) {
    const { verificationStatus } = await requireAuditorAuth();

    const params = await searchParams;
    const startDate = params.start || "";
    const endDate = params.end || "";
    const restaurantId = params.restaurant ? parseInt(params.restaurant) : undefined;
    const allergen = params.allergen || "";

    const result = await generateAuditReport({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        restaurantId,
        allergen: allergen || undefined,
    });

    const logs = result.success ? (result.data ?? []) : [];

    return (
        <div className="flex flex-col gap-6 px-4 lg:px-6 py-4">
            <div className="border-b border-border pb-4">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Audit Reports</h1>
                <p className="text-base text-muted-foreground mt-1">Filter and export audit logs</p>
            </div>

            <VerificationBanner verificationStatus={verificationStatus} />

            <Card>
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent>
                    <form action="/auditor/reports" method="GET" className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <Label htmlFor="start">Start Date</Label>
                            <Input id="start" name="start" type="date" defaultValue={startDate} />
                        </div>
                        <div>
                            <Label htmlFor="end">End Date</Label>
                            <Input id="end" name="end" type="date" defaultValue={endDate} />
                        </div>
                        <div>
                            <Label htmlFor="restaurant">Restaurant ID</Label>
                            <Input id="restaurant" name="restaurant" type="number" placeholder="Optional" defaultValue={params.restaurant || ""} />
                        </div>
                        <div>
                            <Label htmlFor="allergen">Allergen</Label>
                            <Input id="allergen" name="allergen" placeholder="e.g. gluten" defaultValue={allergen} />
                        </div>
                        <div className="md:col-span-4 flex justify-end">
                            <Button type="submit" className="cursor-pointer">Apply Filters</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{!result.success ? "Logs" : `${logs.length} Results`}</CardTitle>
                </CardHeader>
                <CardContent>
                    {!result.success ? (
                        <div className="py-8 text-center text-muted-foreground">{result.message}</div>
                    ) : logs.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">No logs found.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Restaurant</TableHead>
                                    <TableHead>Auditor</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.map((log: Log) => (
                                    <TableRow key={log.id}>
                                        <TableCell><Badge className="capitalize">{log.action.replace(/_/g, " ").toLowerCase()}</Badge></TableCell>
                                        <TableCell>{log.restaurant?.business_name || "Unknown"}</TableCell>
                                        <TableCell>{log.actor?.full_name || log.actor?.email || "Unknown"}</TableCell>
                                        <TableCell>{new Date(log.created_at).toLocaleDateString()}</TableCell>
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