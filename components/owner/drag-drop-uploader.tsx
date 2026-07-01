"use client";

import React, { useRef, useState } from "react";
import { getSecureUploadUrl } from "@/actions/media";
import { SessionUser } from "@/lib/security";

interface UploaderProps {
    currentUser: SessionUser;
    onUploadSuccess: (url: string) => void;
    onUploadError: (err: string) => void;
}

export function DragDropUploader({ currentUser, onUploadSuccess, onUploadError }: UploaderProps) {
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

        // FIX 3: Generate and show the preview instantly, before the upload even starts
        setPreviewUrl(URL.createObjectURL(file));

        setUploading(true);
        setProgress(10);

        try {
            // 1. Get the S3 Pre-Signed Upload Signature
            const response = await getSecureUploadUrl(currentUser, file.name, file.type, file.size);

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
                throw new Error("Direct S3 upload transfer rejected.");
            }

            setProgress(90);

            // Construct final accessible URL
            const finalUrl = `https://${process.env.NEXT_PUBLIC_S3_DOMAIN || "jordan-food-ledger.s3.amazonaws.com"}/${response.fileKey}`;

            onUploadSuccess(finalUrl);
            setProgress(100);
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "Media upload failure.";
            onUploadError(errMsg);
            // If it fails, remove the optimistic preview
            setPreviewUrl(null);
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
                        Image Loaded & Synced
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