// actions/MediaActions.ts - UPGRADED: 3-Layer Security Protocol
"use server";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, ensureStorageBucket, BUCKET_NAME } from "@/lib/s3-service";
import { PreSignedUrlResponse } from "@/lib/shared-types/api";
import { z } from "zod";
import {requireOwnerAuth} from "@/lib/Authentication/RequireOwnerAuth";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

// ═══════════════════════════════════════════════════════════════
// VALIDATION SCHEMA
// ═══════════════════════════════════════════════════════════════

const uploadUrlSchema = z.object({
    fileName: z.string().min(1, "File name is required"),
    fileType: z.string().min(1, "File type is required"),
    fileSize: z.number().positive("File size must be positive"),
});

type UploadUrlInput = z.infer<typeof uploadUrlSchema>;

// ═══════════════════════════════════════════════════════════════
// GET SECURE UPLOAD URL - Generate pre-signed S3 URL for file upload
// ═══════════════════════════════════════════════════════════════

export async function getSecureUploadUrl(
    _mockUser: unknown,
    input: UploadUrlInput
): Promise<PreSignedUrlResponse> {
    try {
        // ═════════════════════════════════════════════════════════════════
        // LAYER 1: AUTH WALL - Verify owner authentication
        // ═════════════════════════════════════════════════════════════════
        const { userId, restaurantId } = await requireOwnerAuth();

        console.log(
            "📤 [MediaAction] Generating upload URL for restaurant:",
            restaurantId,
            "User:",
            userId
        );

        // ═════════════════════════════════════════════════════════════════
        // LAYER 2: ZOD VALIDATION - Validate input
        // ═════════════════════════════════════════════════════════════════
        const validated = uploadUrlSchema.safeParse(input);
        if (!validated.success) {
            console.log("❌ [MediaAction] Validation failed:", validated.error.issues);
            return {
                success: false,
                message: validated.error.issues[0]?.message || "Validation failed",
            };
        }

        const { fileName, fileType, fileSize } = validated.data;

        // ═════════════════════════════════════════════════════════════════
        // LAYER 3: SECURITY CHECKS - File type, size, etc.
        // ═════════════════════════════════════════════════════════════════

        if (!ALLOWED_TYPES.includes(fileType)) {
            return {
                success: false,
                message: "Invalid file type. Only JPEG, PNG, and WEBP images are allowed.",
            };
        }

        if (!Number.isFinite(fileSize) || fileSize <= 0) {
            return {
                success: false,
                message: "The selected file appears to be empty.",
            };
        }

        if (fileSize > MAX_SIZE) {
            return {
                success: false,
                message: "File exceeds 10MB",
            };
        }

        // Ensure the bucket, CORS policies, and read-policies are dynamically initialized
        await ensureStorageBucket();

        // ═════════════════════════════════════════════════════════════════
        // LAYER 3: TENANT ISOLATION - Store in tenant-specific S3 path
        // ═════════════════════════════════════════════════════════════════

        const rawExtension = fileName.includes(".") ? fileName.split(".").pop() : undefined;
        const mimeExtension = fileType.split("/").pop();
        const fileExtension = (rawExtension || mimeExtension || "bin")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "")
            .slice(0, 10) || "bin";

        // S3 key includes restaurantId for tenant isolation
        const uniqueKey = `tenants/${restaurantId}/recipes/${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 8)}.${fileExtension}`;

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: uniqueKey,
            ContentType: fileType,
            ContentLength: fileSize,
        });

        const secondsExpiry = 300;

        // Generate pre-signed URL signing ONLY host and content-type
        const uploadUrl = await getSignedUrl(s3Client, command, {
            expiresIn: secondsExpiry,
            signableHeaders: new Set(["host", "content-type"]),
        });

        console.log("✅ [MediaAction] Upload URL generated successfully for key:", uniqueKey);

        return {
            success: true,
            message: "Upload URL generated successfully.",
            uploadUrl,
            fileKey: uniqueKey,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to establish upload signatures.";

        console.error("❌ [MediaAction] Error:", errorMessage);

        return {
            success: false,
            message: errorMessage,
        };
    }
}