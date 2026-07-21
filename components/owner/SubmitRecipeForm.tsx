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
import { toast } from "sonner"; // 🚨 Import Sonner

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
            // 🚨 1. Use Sonner for success!
            toast.success("Recipe submitted! Our AI is analyzing your ingredients now.");

            setRawText("");
            setImageUrl("");
            setUploaderKey((k) => k + 1);

            setTimeout(() => {
                router.push("/owner/drafts");
            }, 2000);
        } else {
            // 🚨 2. Use Sonner for Draft/AI Rate Limits!
            toast.error(result.message || "Failed to submit recipe.");

            // Optional: Keep this if you STILL want the inline red box to show up too
            setStatusMessage({
                type: "error",
                text: result.message || "Failed to submit recipe. Please try again.",
            });
        }
    }

    return (
        // components/owner/SubmitRecipeForm.tsx – updated JSX

        <form onSubmit={handleSubmit} className="space-y-8">
            {/* Breadcrumb & Header */}
            <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Link href="/owner/recipes" className="flex items-center gap-1 hover:text-foreground transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Recipes
                    </Link>
                    <span>/</span>
                    <span className="text-foreground font-medium">Submit Recipe</span>
                </div>
                <h1 className="text-2xl font-semibold text-foreground">Submit Recipe</h1>
                <p className="text-base text-muted-foreground mt-1">
                    Share your recipe details and let AI extract the nutritional data
                </p>
            </div>

            {/* Info Card */}
            <Card className="border-accent/20 bg-accent/5">
                <CardContent className="pt-6 flex gap-3">
                    <Sparkles className="h-5 w-5 text-carbs flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-foreground/80">
                        <p className="font-semibold text-foreground">AI-Powered Ingredient Extraction</p>
                        <p className="mt-1 opacity-80">
                            Simply describe your recipe naturally, and our AI will automatically extract and standardize ingredient measurements.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Status Messages */}
            {statusMessage && (
                <Alert
                    variant={statusMessage.type === "error" ? "destructive" : "default"}
                    className={
                        statusMessage.type === "success"
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : ""
                    }
                >
                    {statusMessage.type === "success" ? (
                        <CheckCircle2 className="h-5 w-5" />
                    ) : (
                        <AlertCircle className="h-5 w-5" />
                    )}
                    <AlertTitle className="text-base font-semibold capitalize">
                        {statusMessage.type === "success" ? "Success" : "Error"}
                    </AlertTitle>
                    <AlertDescription className="text-sm">{statusMessage.text}</AlertDescription>
                </Alert>
            )}

            {/* Step 1: Preparation Notes */}
            <Card className="border-border shadow-sm">
                <CardHeader className="pb-4">
                    <div className="flex items-start gap-4">
                        <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                            1
                        </div>
                        <div className="space-y-0.5">
                            <CardTitle className="text-xl font-semibold">Describe Your Recipe</CardTitle>
                            <CardDescription className="text-base text-muted-foreground">
                                Write down your ingredients and amounts
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="raw-text" className="text-base font-medium">
                            Preparation Notes *
                        </Label>
                        <Textarea
                            id="raw-text"
                            value={rawText}
                            onChange={(e) => setRawText(e.target.value)}
                            placeholder="Example: 150g grilled chicken breast, 50g strained yogurt, 3 pieces of baked falafel, 100ml tahini sauce..."
                            rows={6}
                            className="resize-none bg-background text-base min-h-[150px]"
                            required
                            disabled={loading}
                        />
                        <p className="text-sm text-muted-foreground">
                            Be as detailed as possible. Include quantities and units (grams, cups, pieces, etc.)
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Step 2: Image Upload */}
            <Card className="border-border shadow-sm">
                <CardHeader className="pb-4">
                    <div className="flex items-start gap-4">
                        <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                            2
                        </div>
                        <div className="space-y-0.5">
                            <CardTitle className="text-xl font-semibold">Add Recipe Image</CardTitle>
                            <CardDescription className="text-base text-muted-foreground">
                                Optional but helps with verification
                            </CardDescription>
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
                            toast.success("Image uploaded successfully!");
                        }}
                        onUploadError={(err) => {
                            setImageUploading(false);
                            toast.error(err);
                            setStatusMessage({ type: "error", text: err });
                        }}
                    />
                </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border">
                <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="uppercase font-semibold text-base h-auto px-6 py-3"
                    onClick={() => router.push("/owner/recipes")}
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={loading || imageUploading || !rawText.trim()}
                    size="lg"
                    className="flex-1 uppercase font-semibold gap-2 text-base h-auto px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                    {loading ? (
                        <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Processing...
                        </>
                    ) : imageUploading ? (
                        <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Uploading Image...
                        </>
                    ) : (
                        <>
                            <Sparkles className="h-5 w-5" />
                            Submit & Extract
                        </>
                    )}
                </Button>
            </div>

            {/* Info Footer */}
            <div className="text-center text-sm text-muted-foreground space-y-2 pt-4 border-t border-border/50">
                <p>
                    Once submitted, you&apos;ll be able to review and adjust the extracted ingredients before finalizing your recipe.
                </p>
                <p>
                    Need help? <Link href="/help" className="text-primary hover:underline">View submission guide</Link>
                </p>
            </div>
        </form>
    );
}