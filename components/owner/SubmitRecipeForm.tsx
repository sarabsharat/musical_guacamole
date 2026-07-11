"use client";

import React, { useState } from "react";
import { submitRawDraft } from "@/actions/DraftsActions";
import { DragDropUploader } from "@/components/owner/drag-drop-uploader";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SubmitRecipeFormProps {
    currentUser: any;
    tenant: any;
}

export default function SubmitRecipeForm({ currentUser, tenant }: SubmitRecipeFormProps) {
    const [rawText, setRawText] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [imageUploading, setImageUploading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [uploaderKey, setUploaderKey] = useState(0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!rawText.trim()) {
            setStatusMessage({ type: "error", text: "Please enter your recipe preparation notes." });
            return;
        }

        if (imageUploading) {
            setStatusMessage({ type: "error", text: "Please wait for the image upload to finish before submitting." });
            return;
        }

        setLoading(true);
        setStatusMessage(null);

        const result = await submitRawDraft({
            raw_text: rawText,
            image_url: imageUrl,
        });

        setLoading(false);

        if (result.success) {
            setStatusMessage({
                type: "success",
                text: "Recipe notes ingested. Our AI engine is parsing raw metrics to prepare resolutions.",
            });
            setRawText("");
            setImageUrl("");
            setUploaderKey((k) => k + 1);
        } else {
            setStatusMessage({
                type: "error",
                text: result.message || "Failed to ingest recipe.",
            });
        }
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="mx-auto max-w-2xl">
                {/* Breadcrumb */}
                <div className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Link href="/owner/recipes" className="hover:text-foreground transition-colors">
                        Menu Portfolio
                    </Link>
                    <span>/</span>
                    <span>Zero-Search Ingestion</span>
                </div>

                {/* Header Card */}
                <div className="mb-8 rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
                    <h1 className="text-3xl font-black uppercase tracking-tight">Ingest Recipe Draft</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Dictate, paste, or list raw meal details naturally. AI extracts precise gram metrics asynchronously.
                    </p>
                </div>

                {/* Status Message */}
                {statusMessage && (
                    <Alert className="mb-6" variant={statusMessage.type === "error" ? "destructive" : "default"}>
                        {statusMessage.type === "success" ? (
                            <CheckCircle2 className="h-4 w-4" />
                        ) : (
                            <AlertCircle className="h-4 w-4" />
                        )}
                        <AlertTitle className="capitalize">{statusMessage.type}</AlertTitle>
                        <AlertDescription>{statusMessage.text}</AlertDescription>
                    </Alert>
                )}

                {/* Form Card */}
                <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Section 1: Preparation Description */}
                        <div className="space-y-2">
                            <Label htmlFor="raw-text" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                1. Unstructured Preparation Notes
                            </Label>
                            <Textarea
                                id="raw-text"
                                required
                                rows={6}
                                value={rawText}
                                onChange={(e) => setRawText(e.target.value)}
                                placeholder="Example: 150g grilled chicken breast, 50g strained yogurt, and 3 pieces of baked falafel."
                                className="resize-none bg-background"
                            />
                        </div>

                        {/* Section 2: Media Ingestion */}
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                2. Recipe Image Reference
                            </Label>
                            <DragDropUploader
                                key={uploaderKey}
                                onUploadStart={() => setImageUploading(true)}
                                onUploadSuccess={(url) => {
                                    setImageUploading(false);
                                    setImageUrl(url);
                                }}
                                onUploadError={(err) => {
                                    setImageUploading(false);
                                    setStatusMessage({ type: "error", text: err });
                                }}
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 border-t pt-6">
                            <Button
                                type="submit"
                                disabled={loading || imageUploading}
                                size="lg"
                                className="flex-1 uppercase font-semibold"
                            >
                                {loading ? "Processing..." : imageUploading ? "Waiting for image..." : "Trigger AI Extraction"}
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                size="lg"
                                className="uppercase font-semibold"
                            >
                                <Link href="/owner/drafts">Check Active Queue</Link>
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}