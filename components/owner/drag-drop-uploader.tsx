"use client";

import React, { useEffect, useRef, useState } from "react";
import { getSecureUploadUrl } from "@/actions/MediaActions";
import {
    Upload,
    CheckCircle2,
    AlertCircle,
    X,
    FileImage,
    Loader2,
} from "lucide-react";
import {
    Attachment,
    AttachmentAction,
    AttachmentActions,
    AttachmentContent,
    AttachmentDescription,
    AttachmentMedia,
    AttachmentTitle,
} from "@/components/ui/attachment";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UploaderProps {
    onUploadSuccess: (url: string) => void;
    onUploadError: (err: string) => void;
    onUploadStart?: () => void;
    className?: string;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function DragDropUploader({
                                     onUploadSuccess,
                                     onUploadError,
                                     onUploadStart,
                                     className,
                                 }: UploaderProps) {
    const [dragActive, setDragActive] = useState(false);
    const [uploadState, setUploadState] = useState<"idle" | "uploading" | "processing" | "error" | "done">("idle");
    const [progress, setProgress] = useState(0);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [fileName, setFileName] = useState("");
    const [fileSize, setFileSize] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const previewUrlRef = useRef<string | null>(null);

    useEffect(() => {
        return () => {
            if (previewUrlRef.current) {
                URL.revokeObjectURL(previewUrlRef.current);
            }
        };
    }, []);

    const setPreview = (url: string | null) => {
        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
        }
        previewUrlRef.current = url;
        setPreviewUrl(url);
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const processFile = async (file: File) => {
        if (!file) return;

        setError(null);
        setFileName(file.name);
        setFileSize(file.size);

        // Validate type
        if (!ALLOWED_TYPES.includes(file.type)) {
            const err = "Invalid file type. Only JPEG, PNG, and WEBP are allowed.";
            setError(err);
            onUploadError(err);
            setUploadState("error");
            return;
        }

        // Validate size
        if (file.size > MAX_SIZE) {
            const err = "File exceeds 10MB limit.";
            setError(err);
            onUploadError(err);
            setUploadState("error");
            return;
        }

        if (file.size <= 0) {
            const err = "File appears to be empty.";
            setError(err);
            onUploadError(err);
            setUploadState("error");
            return;
        }

        // Show preview
        setPreview(URL.createObjectURL(file));
        setUploadState("uploading");
        setProgress(10);
        onUploadStart?.();

        try {
            const response = await getSecureUploadUrl(undefined, {
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
            });

            if (!response.success || !response.uploadUrl || !response.fileKey) {
                throw new Error(response.message || "Failed to generate upload URL.");
            }

            setProgress(40);
            setUploadState("processing");

            // Upload to S3
            const uploadResult = await fetch(response.uploadUrl, {
                method: "PUT",
                headers: {
                    "Content-Type": file.type,
                },
                body: file,
            });

            if (!uploadResult.ok) {
                const detail = `${uploadResult.status} ${uploadResult.statusText}`.trim();
                throw new Error(`Upload failed (${detail || "unknown error"}).`);
            }

            setProgress(90);

            // Construct final URL
            const minioBase = process.env.NEXT_PUBLIC_MINIO_URL || "http://localhost:9000";
            const bucketName = process.env.NEXT_PUBLIC_BUCKET_NAME || "musical-guacamole";

            const finalUrl = `${minioBase}/${bucketName}/${response.fileKey}`;
            onUploadSuccess(finalUrl);
            setProgress(100);
            setUploadState("done");
        } catch (err: unknown) {
            const isNetworkError = err instanceof TypeError;
            const errMsg = isNetworkError
                ? "Network error. Check your connection and try again."
                : err instanceof Error
                    ? err.message // 🚨 This extracts "Upload limit exceeded. Try again in 58 seconds." from MediaActions
                    : "Upload failed.";

            setError(errMsg);
            onUploadError(errMsg); // 🚨 This notifies SubmitRecipeForm, which triggers toast.error(err)
            setUploadState("error");
            setPreview(null);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            await processFile(e.target.files[0]);
            e.target.value = "";
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            await processFile(e.dataTransfer.files[0]);
        }
    };

    const handleClear = () => {
        setPreview(null);
        setProgress(0);
        setError(null);
        setUploadState("idle");
        setFileName("");
        setFileSize(0);
    };

    const triggerInput = () => {
        if (uploadState !== "uploading" && uploadState !== "processing") {
            fileInputRef.current?.click();
        }
    };

    // Format file size
    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    };

    // Determine state for Attachment
    const attachmentState = uploadState === "idle" ? "done" : uploadState;

    return (
        <div className={cn("space-y-4", className)}>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
            />

            {/* Error Alert */}
            {error && uploadState === "error" && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Upload Area */}
            {uploadState === "idle" ? (
                // Dropzone empty state – styled like shadcn
                <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={triggerInput}
                    className={cn(
                        "relative cursor-pointer rounded-lg border-2 border-dashed transition-all duration-200 p-8 text-center",
                        dragActive
                            ? "border-primary bg-primary/5 scale-[1.02]"
                            : "border-border bg-muted/30 hover:bg-muted/50"
                    )}
                >
                    <div className="flex flex-col items-center gap-2">
                        <div className="rounded-full bg-primary/10 p-3">
                            <Upload className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                            <p className="font-semibold text-foreground">
                                Drag your image here
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                                or click to browse (JPEG, PNG, WEBP — max 10MB)
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                // Preview using shadcn Attachment components
                <Attachment
                    state={attachmentState}
                    size="default"
                    orientation="horizontal"
                    className="border rounded-lg p-2 bg-background"
                >
                    <AttachmentMedia variant="image" className="w-20 h-20 flex-shrink-0">
                        {previewUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={previewUrl}
                                alt={fileName}
                                className="h-full w-full object-cover rounded-md"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center bg-muted rounded-md">
                                <FileImage className="h-8 w-8 text-muted-foreground" />
                            </div>
                        )}
                    </AttachmentMedia>
                    <AttachmentContent>
                        <AttachmentTitle className="font-medium truncate max-w-[150px]">
                            {fileName || "Untitled"}
                        </AttachmentTitle>
                        <AttachmentDescription>
                            {uploadState === "uploading" || uploadState === "processing"
                                ? `${Math.round(progress)}% uploaded`
                                : uploadState === "error"
                                    ? "Upload failed"
                                    : `${formatFileSize(fileSize)}`}
                        </AttachmentDescription>
                    </AttachmentContent>
                    <AttachmentActions>
                        {uploadState === "uploading" || uploadState === "processing" ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        ) : uploadState === "error" ? (
                            <AttachmentAction
                                aria-label="Retry upload"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // Re‑trigger upload with the same file? We need to store the file object.
                                    // For simplicity, we clear and let user re‑select.
                                    handleClear();
                                    triggerInput();
                                }}
                            >
                                <AlertCircle className="h-4 w-4" />
                            </AttachmentAction>
                        ) : uploadState === "done" ? (
                            <>
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <AttachmentAction
                                    aria-label="Remove file"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleClear();
                                    }}
                                >
                                    <X className="h-4 w-4" />
                                </AttachmentAction>
                            </>
                        ) : null}
                    </AttachmentActions>
                </Attachment>
            )}
        </div>
    );
}