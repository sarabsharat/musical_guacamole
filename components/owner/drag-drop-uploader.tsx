"use client";

import React, { useEffect, useRef, useState } from "react";
import { getSecureUploadUrl } from "@/actions/media";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";

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

        // Validate type
        if (!ALLOWED_TYPES.includes(file.type)) {
            onUploadError("Invalid file type. Only JPEG, PNG, and WEBP images are allowed.");
            return;
        }

        // Validate size
        if (file.size > MAX_SIZE) {
            onUploadError("File exceeds 10MB.");
            return;
        }

        if (file.size <= 0) {
            onUploadError("The selected file appears to be empty.");
            return;
        }

        // Show preview
        setPreview(URL.createObjectURL(file));

        setUploading(true);
        setProgress(10);
        onUploadStart?.();

        try {
            // Get presigned URL
            const response = await getSecureUploadUrl(file.name, file.type, file.size);

            if (!response.success || !response.uploadUrl || !response.fileKey) {
                throw new Error(response.message || "Failed to generate upload signature.");
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
                throw new Error(`Direct upload to storage was rejected (${detail || "unknown error"}).`);
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
                ? "Couldn't reach the storage service. Check your connection and try again."
                : err instanceof Error
                    ? err.message
                    : "Media upload failure.";
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

    const triggerInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={triggerInput}
            className={`
                relative cursor-pointer rounded-lg border-2 border-dashed p-6 transition-colors
                ${dragActive
                ? "border-destructive bg-destructive/10"
                : "border-border bg-muted/50"
            }
            `}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                onClick={(e) => e.stopPropagation()}
                className="hidden"
            />

            {previewUrl ? (
                <div className="space-y-4">
                    {/* Preview Image */}
                    <div className="mx-auto relative h-40 w-40 overflow-hidden rounded-lg border-2 border-border bg-background">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={previewUrl} alt="Meal Preview" className="h-full w-full object-cover" />
                    </div>

                    {/* Status Text */}
                    <div className="flex items-center justify-center gap-2 text-sm font-semibold">
                        {uploading ? (
                            <>
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                <span>Uploading...</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <span className="text-green-600">Image Loaded & Synced</span>
                            </>
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-3 text-center">
                    <div className="flex justify-center">
                        <Upload className={`h-8 w-8 ${dragActive ? "text-destructive" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                        <div className="text-sm font-semibold">Drag meal image here</div>
                        <p className="text-xs text-muted-foreground">
                            OR CLICK TO BROWSE (JPEG, PNG, WEBP — MAX 10MB)
                        </p>
                    </div>
                </div>
            )}

            {/* Upload Progress Bar */}
            {uploading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-white/90 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-xs space-y-2">
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-center text-xs font-semibold text-muted-foreground">
                            Uploading... {progress}%
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}