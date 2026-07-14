"use client";

import React, { useEffect, useRef, useState } from "react";
import { getSecureUploadUrl } from "@/actions/MediaActions";
import { Upload, CheckCircle2, AlertCircle, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface UploaderProps {
    onUploadSuccess: (url: string) => void;
    onUploadError: (err: string) => void;
    onUploadStart?: () => void;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function DragDropUploader({ onUploadSuccess, onUploadError, onUploadStart }: UploaderProps) {
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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

        // Validate type
        if (!ALLOWED_TYPES.includes(file.type)) {
            const err = "Invalid file type. Only JPEG, PNG, and WEBP are allowed.";
            setError(err);
            onUploadError(err);
            return;
        }

        // Validate size
        if (file.size > MAX_SIZE) {
            const err = "File exceeds 10MB limit.";
            setError(err);
            onUploadError(err);
            return;
        }

        if (file.size <= 0) {
            const err = "File appears to be empty.";
            setError(err);
            onUploadError(err);
            return;
        }

        // Show preview
        setPreview(URL.createObjectURL(file));

        setUploading(true);
        setProgress(10);
        onUploadStart?.();

        try {
            // ✅ FIX: Removed file.size so it only passes the 2 expected arguments
            const response = await getSecureUploadUrl(undefined, {
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size
            });

            if (!response.success || !response.uploadUrl || !response.fileKey) {
                throw new Error(response.message || "Failed to generate upload URL.");
            }

            setProgress(40);

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
        } catch (err: unknown) {
            const isNetworkError = err instanceof TypeError;
            const errMsg = isNetworkError
                ? "Network error. Check your connection and try again."
                : err instanceof Error
                    ? err.message
                    : "Upload failed.";
            setError(errMsg);
            onUploadError(errMsg);
            setPreview(null);
        } finally {
            setUploading(false);
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
    };

    const triggerInput = () => {
        if (!uploading && !previewUrl) {
            fileInputRef.current?.click();
        }
    };

    return (
        <div className="space-y-4">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
            />

            {/* Error Alert */}
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Upload Area */}
            <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={triggerInput}
                className={`
                    relative cursor-pointer rounded-lg border-2 border-dashed transition-all duration-200
                    ${dragActive
                    ? "border-primary bg-primary/5 scale-105"
                    : previewUrl
                        ? "border-border bg-muted/50"
                        : "border-border bg-muted/30 hover:bg-muted/50"
                }
                `}
            >
                {previewUrl ? (
                    // Preview State
                    <div className="p-6 space-y-4">
                        <div className="mx-auto relative h-48 w-full max-w-sm overflow-hidden rounded-lg border bg-background">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={previewUrl}
                                alt="Preview"
                                className="h-full w-full object-cover"
                            />
                        </div>

                        {/* Status */}
                        <div className="flex items-center justify-center gap-2">
                            {uploading ? (
                                <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                    <span className="text-sm font-medium">Uploading...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    <span className="text-sm font-medium text-green-600">Image Ready</span>
                                </>
                            )}
                        </div>

                        {/* Progress Bar */}
                        {uploading && (
                            <div className="w-full space-y-2">
                                <div className="relative h-2 w-full overflow-hidden rounded-full bg-border">
                                    <div
                                        className="h-full bg-primary transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <p className="text-center text-xs text-muted-foreground">
                                    {progress}% uploaded
                                </p>
                            </div>
                        )}

                        {/* Clear Button */}
                        {!uploading && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleClear();
                                }}
                                className="w-full gap-2"
                            >
                                <X className="h-4 w-4" />
                                Choose Different Image
                            </Button>
                        )}
                    </div>
                ) : (
                    // Empty State
                    <div className="py-12 px-6 text-center space-y-3">
                        <div className="flex justify-center">
                            <div className="rounded-full bg-primary/10 p-4">
                                <Upload className="h-8 w-8 text-primary" />
                            </div>
                        </div>
                        <div>
                            <p className="font-semibold text-foreground">
                                Drag your image here
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                or click to browse (JPEG, PNG, WEBP — max 10MB)
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Supported Formats Info */}
            <p className="text-xs text-muted-foreground text-center">
                Supported formats: JPEG, PNG, WebP • Maximum file size: 10MB
            </p>
        </div>
    );
}