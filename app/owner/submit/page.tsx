"use client";

import React, { useState } from "react";
import { submitRawDraft } from "@/actions/owner-drafts";
import { DragDropUploader } from "@/components/owner/drag-drop-uploader";
import Link from "next/link";
// Session is resolved server-side by server actions; no client-side session needed here.

export default function SubmitRecipeForm() {
    const [rawText, setRawText] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [imageUploading, setImageUploading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    // BUG FIX: DragDropUploader keeps its own internal `previewUrl` state.
    // On a successful submit we cleared this page's `imageUrl`, but the
    // uploader itself never got told to reset, so its preview image stayed
    // on screen even though the form had already been cleared — the next
    // submission would then silently go out with image_url: "" while the
    // owner still saw (and assumed they were reusing) the old preview.
    // Bumping this key forces a clean remount of the uploader whenever we
    // reset the form.
    const [uploaderKey, setUploaderKey] = useState(0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rawText.trim()) {
            setStatusMessage({ type: "error", text: "Please enter your recipe preparation notes." });
            return;
        }
        // BUG FIX: previously nothing stopped the owner from hitting submit
        // while an image upload was still in flight, so the draft could be
        // created with a stale/empty image_url even though a preview was
        // already showing.
        if (imageUploading) {
            setStatusMessage({ type: "error", text: "Please wait for the image upload to finish before submitting." });
            return;
        }

        setLoading(true);
        setStatusMessage(null);

        // submitRawDraft now resolves the server-side session itself; clients should only send the payload.
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
                text: result.message,
            });
        }
    };

    return (
        <div className="min-h-screen bg-neutral-100 p-8 text-black">
            <div className="mx-auto max-w-2xl border-4 border-black bg-white p-6 rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">

                {/* Navigation Breadcrumb */}
                <div className="mb-6 font-mono text-xs uppercase flex space-x-2">
                    <Link href="/owner/recipes" className="underline hover:text-red-500">Menu Portfolio</Link>
                    <span>/</span>
                    <span className="text-neutral-500">Zero-Search Ingestion</span>
                </div>

                <div className="border-b-4 border-black pb-4 mb-6">
                    <h1 className="font-mono text-3xl font-extrabold uppercase tracking-tight">
                        Ingest Recipe Draft
                    </h1>
                    <p className="font-mono text-xs text-neutral-600 mt-1">
                        Dictate, paste, or list raw meal details naturally. AI extracts precise gram metrics asynchronously.
                    </p>
                </div>

                {statusMessage && (
                    <div
                        className={`border-4 p-4 font-mono text-sm uppercase mb-6 rounded-none ${
                            statusMessage.type === "success"
                                ? "border-green-600 bg-green-50 text-green-700"
                                : "border-red-600 bg-red-50 text-red-700"
                        }`}
                    >
                        <div className="font-bold">{statusMessage.type === "success" ? "Success" : "Error"}</div>
                        <div className="mt-1 text-xs">{statusMessage.text}</div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Section 1: Preparation Description Textarea */}
                    <div className="space-y-2">
                        <label className="block font-mono text-sm font-bold uppercase">
                            1. Unstructured Preparation Notes
                        </label>
                        <textarea
                            required
                            rows={6}
                            value={rawText}
                            onChange={(e) => setRawText(e.target.value)}
                            placeholder="Example: 150g cooked rice, a medium piece of broiled chicken breast, 2 tablespoons of hummus, and drizzle 10g of local olive oil on top."
                            className="w-full border-4 border-black p-3 font-mono text-xs rounded-none focus:outline-none focus:bg-neutral-50"
                        />
                    </div>

                    {/* Section 2: Media Ingestion Uploader */}
                    <div className="space-y-2">
                        <label className="block font-mono text-sm font-bold uppercase">
                            2. Recipe Image Reference
                        </label>
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

                    {/* Section 3: Submission Action Buttons */}
                    <div className="flex gap-4 pt-4 border-t-2 border-black">
                        <button
                            type="submit"
                            disabled={loading || imageUploading}
                            className="flex-1 bg-black text-white py-3 font-mono text-sm font-bold uppercase border-2 border-black rounded-none transition hover:bg-neutral-800 disabled:opacity-45"
                        >
                            {loading ? "Processing..." : imageUploading ? "Waiting for image..." : "Trigger AI Extraction"}
                        </button>
                        <Link
                            href="/owner/drafts"
                            className="bg-white text-black px-6 py-3 font-mono text-sm font-bold uppercase border-2 border-black rounded-none hover:bg-neutral-50 flex items-center justify-center"
                        >
                            Check Active Queue
                        </Link>
                    </div>

                </form>
            </div>
        </div>
    );
}
