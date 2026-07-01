"use client";

import React, { useEffect, useRef, useState } from "react";
import { getSecureUploadUrl } from "@/actions/media";

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
    // BUG FIX: object URLs created via URL.createObjectURL() are never
    // released automatically. Keep a ref to the current one so we can
    // revoke it whenever it's replaced or the component unmounts, instead
    // of leaking a blob URL every time the owner picks a new image.
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

        // BUG FIX: the `accept` attribute on the hidden <input> only filters
        // what's offered in the native file picker — it does nothing for
        // drag-and-drop, so a dropped PDF/GIF/etc. used to sail straight
        // into an upload attempt (burning a presigned URL and a network
        // round trip) before finally being rejected by the server. We now
        // validate type and size up front and fail fast with a clear
        // message, before ever touching the network or showing a preview.
        if (!ALLOWED_TYPES.includes(file.type)) {
            onUploadError("Invalid file type. Only JPEG, PNG, and WEBP images are allowed.");
            return;
        }
        if (file.size > MAX_SIZE) {
            onUploadError("File exceeds 10MB.");
            return;
        }
        if (file.size <= 0) {
            onUploadError("The selected file appears to be empty.");
            return;
        }

        // FIX 3: Generate and show the preview instantly, before the upload even starts
        setPreview(URL.createObjectURL(file));

        setUploading(true);
        setProgress(10);
        onUploadStart?.();

        try {
            // 1. Get the S3 Pre-Signed Upload Signature (server action resolves session)
            const response = await getSecureUploadUrl(file.name, file.type, file.size);

            if (!response.success || !response.uploadUrl || !response.fileKey) {
                throw new Error(response.message || "Failed to generate upload signature.");
            }

            setProgress(40);

            // 2. Perform direct HTTP PUT streaming to S3 Bucket
            const uploadResult = await fetch(response.uploadUrl, {
                method: "PUT",
                headers: {
                    "Content-Type": file.type,
                },
                body: file,
            });

            if (!uploadResult.ok) {
                // BUG FIX: this used to always say "Direct S3 upload transfer
                // rejected." with no detail, making it impossible to tell a
                // CORS failure apart from an expired URL or a bucket that
                // doesn't exist. Surface the actual status where we can.
                const detail = `${uploadResult.status} ${uploadResult.statusText}`.trim();
                throw new Error(`Direct upload to storage was rejected (${detail || "unknown error"}).`);
            }

            setProgress(90);

            // Construct final accessible URL
            const minioBase = process.env.NEXT_PUBLIC_MINIO_URL || "http://localhost:9000";
            const bucketName = process.env.NEXT_PUBLIC_BUCKET_NAME || "musical-guacamole";

            const finalUrl = `${minioBase}/${bucketName}/${response.fileKey}`;
            onUploadSuccess(finalUrl);
            setProgress(100);
        } catch (err: unknown) {
            // A failed `fetch()` to the presigned URL (e.g. blocked by CORS
            // because the bucket's CORS policy isn't set up) throws a bare
            // "Failed to fetch" TypeError with no useful detail — give the
            // owner something actionable instead of a dead end.
            const isNetworkError = err instanceof TypeError;
            const errMsg = isNetworkError
                ? "Couldn't reach the storage service. Check your connection and try again."
                : err instanceof Error
                    ? err.message
                    : "Media upload failure.";
            onUploadError(errMsg);
            // If it fails, remove the optimistic preview
            setPreview(null);
        } finally {
            setUploading(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            await processFile(e.target.files[0]);
            // FIX 2: Reset the input value so the same file can be selected again
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
            className={`border-4 border-dashed p-6 text-center transition rounded-none relative cursor-pointer ${
                dragActive ? "border-red-500 bg-red-50" : "border-black bg-neutral-50"
            }`}
            onClick={triggerInput}
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
                    <div className="mx-auto w-40 h-40 border-4 border-black bg-white rounded-none overflow-hidden relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={previewUrl} alt="Meal Preview" className="w-full h-full object-cover" />
                    </div>
                    <p className="font-mono text-xs font-bold uppercase text-green-600">
                        {uploading ? "Uploading..." : "Image Loaded & Synced"}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    <div className="font-mono text-lg font-bold uppercase">Drag meal image here</div>
                    <p className="font-mono text-xs text-neutral-500">
                        OR CLICK TO BROWSE (JPEG, PNG, WEBP — MAX 10MB)
                    </p>
                </div>
            )}

            {uploading && (
                <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center p-4">
                    <div className="w-full border-4 border-black h-8 bg-neutral-100 rounded-none overflow-hidden relative">
                        <div
                            className="bg-black h-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold text-neutral-800 mix-blend-difference">
              Uploading... {progress}%
            </span>
                    </div>
                </div>
            )}
        </div>
    );
}
