"use client";

import React, { useState } from "react";
import { submitRawDraft } from "@/actions/DraftsActions";
import { DragDropUploader } from "@/components/owner/drag-drop-uploader";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, ArrowLeft, Loader2, Sparkles } from "lucide-react";

interface SubmitRecipeFormProps {
    currentUser: unknown;
    tenant: unknown;
}

export default function SubmitRecipeForm({ currentUser, tenant }: SubmitRecipeFormProps) {
    const router = useRouter();
    const [rawText, setRawText] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [imageUploading, setImageUploading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [uploaderKey, setUploaderKey] = useState(0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!rawText.trim()) {
            setStatusMessage({
                type: "error",
                text: "Please describe your recipe before submitting.",
            });
            return;
        }

        if (imageUploading) {
            setStatusMessage({
                type: "error",
                text: "Please wait for the image upload to complete.",
            });
            return;
        }

        setLoading(true);
        setStatusMessage(null);

        const result = await submitRawDraft(undefined, {
            raw_text: rawText,
            image_url: imageUrl,
        });

        setLoading(false);

        if (result.success) {
            setStatusMessage({
                type: "success",
                text: "✓ Recipe submitted! Our AI is analyzing your ingredients now.",
            });
            setRawText("");
            setImageUrl("");
            setUploaderKey((k) => k + 1);

            // Redirect after success
            setTimeout(() => {
                router.push("/owner/drafts");
            }, 2000);
        } else {
            setStatusMessage({
                type: "error",
                text: result.message || "Failed to submit recipe. Please try again.",
            });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="min-h-screen bg-background space-y-8 p-4 md:p-8">
            <div className="mx-auto max-w-2xl space-y-6">
                {/* Breadcrumb & Header */}
                <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                        <Link href="/owner/recipes" className="flex items-center gap-1 hover:text-foreground transition-colors">
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </Link>
                        <span>/</span>
                        <span>Quick Submit</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight">Submit Recipe</h1>
                    <p className="mt-2 text-muted-foreground">
                        Share your recipe details and let AI extract the nutritional data
                    </p>
                </div>

                {/* Info Card */}
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-6 flex gap-3">
                        <Sparkles className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-900">
                            <p className="font-semibold">AI-Powered Ingredient Extraction</p>
                            <p className="mt-1 opacity-90">
                                Simply describe your recipe naturally, and our AI will automatically extract and standardize ingredient measurements.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Status Messages */}
                {statusMessage && (
                    <Alert variant={statusMessage.type === "error" ? "destructive" : "default"} className={statusMessage.type === "success" ? "bg-green-50 border-green-200 text-green-900" : ""}>
                        {statusMessage.type === "success" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                            <AlertCircle className="h-4 w-4" />
                        )}
                        <AlertTitle className="capitalize">
                            {statusMessage.type === "success" ? "Success" : "Error"}
                        </AlertTitle>
                        <AlertDescription>{statusMessage.text}</AlertDescription>
                    </Alert>
                )}

                {/* Step 1: Preparation Notes */}
                <Card>
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-bold mr-3">
                                    1
                                </div>
                            </div>
                            <div className="flex-1">
                                <CardTitle>Describe Your Recipe</CardTitle>
                                <CardDescription>Write down your ingredients and amounts</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="raw-text" className="font-semibold text-base">
                                Preparation Notes *
                            </Label>
                            <Textarea
                                id="raw-text"
                                value={rawText}
                                onChange={(e) => setRawText(e.target.value)}
                                placeholder="Example: 150g grilled chicken breast, 50g strained yogurt, 3 pieces of baked falafel, 100ml tahini sauce..."
                                rows={6}
                                className="resize-none bg-background"
                                required
                                disabled={loading}
                            />
                            <p className="text-xs text-muted-foreground">
                                Be as detailed as possible. Include quantities and units (grams, cups, pieces, etc.)
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Step 2: Image Upload */}
                <Card>
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-bold mr-3">
                                    2
                                </div>
                            </div>
                            <div className="flex-1">
                                <CardTitle>Add Recipe Image</CardTitle>
                                <CardDescription>Optional but helps with verification</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <DragDropUploader
                            key={uploaderKey}
                            onUploadStart={() => setImageUploading(true)}
                            onUploadSuccess={(url) => {
                                setImageUploading(false);
                                setImageUrl(url);
                                setStatusMessage(null);
                            }}
                            onUploadError={(err) => {
                                setImageUploading(false);
                                setStatusMessage({ type: "error", text: err });
                            }}
                        />
                    </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-6 border-t">
                    <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        className="uppercase font-semibold"
                        onClick={() => router.push("/owner/recipes")}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={loading || imageUploading || !rawText.trim()}
                        size="lg"
                        className="flex-1 uppercase font-semibold gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Processing...
                            </>
                        ) : imageUploading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Uploading Image...
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4" />
                                Submit & Extract
                            </>
                        )}
                    </Button>
                </div>

                {/* Info Footer */}
                <div className="text-center text-xs text-muted-foreground space-y-2 pt-4">
                    <p>
                        Once submitted, you&apos;ll be able to review and adjust the extracted ingredients before finalizing your recipe.
                    </p>
                    <p>
                        Need help? <Link href="/help" className="text-primary hover:underline">View submission guide</Link>
                    </p>
                </div>
            </div>
        </form>
    );
}