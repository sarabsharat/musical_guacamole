// app/auditor/queue/page.tsx
import React from "react";
import { requireAuditorAuth } from "@/lib/Authentication/RequireAuditorAuth";
import { getPendingAuditQueue } from "@/actions/AuditorActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import Link from "next/link";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function AuditorQueuePage() {
    await requireAuditorAuth();

    const result = await getPendingAuditQueue();
    const queue = result.success ? (result.data ?? []) : [];

    return (
        <div className="flex flex-col gap-6 px-4 lg:px-6 py-4">
            <div className="border-b border-border pb-4">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Recipe Queue</h1>
                <p className="text-base text-muted-foreground mt-1">Review pending recipe submissions (Level 1 Digital Verification)</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Pending Recipes</CardTitle>
                </CardHeader>
                <CardContent>
                    {queue.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">The queue is empty. Great job! 🎉</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Recipe Name</TableHead>
                                    <TableHead>Restaurant</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {queue.map((recipe) => (
                                    <TableRow key={recipe.id}>
                                        <TableCell className="font-medium">#{recipe.id}</TableCell>
                                        <TableCell>{recipe.meal_name}</TableCell>
                                        <TableCell>{recipe.restaurant?.business_name || "Unknown"}</TableCell>
                                        <TableCell><StatusBadge status={recipe.status} /></TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/auditor/queue/${recipe.id}`}>
                                                <Button variant="secondary" size="sm" className="gap-2">
                                                    <Eye className="h-4 w-4" /> Review
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