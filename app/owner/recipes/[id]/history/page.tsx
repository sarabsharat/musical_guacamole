// src/app/owner/history/page.tsx
import React from "react";
import { prisma } from "@/lib/prisma";
import { serializePrisma } from "@/lib/serialize";
import { requireOwnerAuth } from "@/lib/Authentication/RequireOwnerAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { History, ShieldAlert } from "lucide-react";

export default async function HistoryPage() {
    // 1. 🚨 SECURITY: The un-hackable Auth Wall
    const { restaurantId } = await requireOwnerAuth();

    // 2. Fetch the 50 most recent Audit Logs with Strict Tenant Isolation
    const rawLogs = await prisma.auditLog.findMany({
        where: {
            restaurant_id: restaurantId, // 👈 Locked to this specific owner
        },
        orderBy: {
            id: "desc",
        },
        include: {
            // Join the recipe table just to grab the meal name for the UI
            recipe: {
                select: { meal_name: true }
            }
        },
        take: 50,
    });

    const logs = serializePrisma(rawLogs);

    // Helper to format the action text nicely
    const formatAction = (action: string) => {
        return action.replace(/_/g, " ");
    };

    return (
        <div className="container mx-auto px-4 md:px-8 py-6 space-y-6 bg-background">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0 pb-4 border-b border-border">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Audit Log History</h1>
                    <p className="text-muted-foreground mt-1">
                        A secure ledger of all recipe modifications, snapshot rollbacks, and compliance actions.
                    </p>
                </div>
            </div>

            {/* Main Log Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                        <History className="mr-2 h-5 w-5 text-muted-foreground" />
                        Recent Restaurant Activity
                    </CardTitle>
                    <CardDescription>
                        Showing the last 50 tracked events for your establishment.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="font-semibold w-[200px]">Timestamp</TableHead>
                                    <TableHead className="font-semibold">Event Type</TableHead>
                                    <TableHead className="font-semibold">Recipe Impacted</TableHead>
                                    <TableHead className="font-semibold">Metadata</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                                            <ShieldAlert className="mx-auto h-8 w-8 mb-2 opacity-20" />
                                            No audit logs have been recorded yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    logs.map((log: any) => (
                                        <TableRow key={log.id} className="transition-colors hover:bg-muted/50">
                                            <TableCell className="text-sm text-muted-foreground">
                                                {/* Requires the log to have a created_at field, if not, adjust to your schema */}
                                                {log.created_at ? new Date(log.created_at).toLocaleString() : `Log #${log.id}`}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-[10px] font-mono tracking-wider uppercase">
                                                    {formatAction(log.action)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {log.recipe?.meal_name || "Unknown / Deleted Recipe"}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                                                {log.payload ? JSON.stringify(log.payload) : "-"}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}