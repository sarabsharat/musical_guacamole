// actions/media.ts
"use server";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { assertUserAccess } from "@/lib/security";
import { Role } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { s3Client, ensureStorageBucket, BUCKET_NAME } from "@/lib/s3-service";
import {PreSignedUrlResponse} from "@/lib/shared-types/api";


const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function getSecureUploadUrl(
    fileName: string,
    fileType: string,
    fileSize: number
): Promise<PreSignedUrlResponse> {
    // Resolve session server-side for clients that call this action [5]
    const currentUser = await getSession();

    // 🚨 GUARDRAIL OUTSIDE THE TRY/CATCH 🚨
    await assertUserAccess(currentUser, [Role.restaurant_owner], currentUser?.restaurantId);

    if (!currentUser || !currentUser.restaurantId) {
        throw new Error("Security Violation: No tenant context found.");
    }

    try {
        if (!ALLOWED_TYPES.includes(fileType)) {
            return { success: false, message: "Invalid file type. Only JPEG, PNG, and WEBP images are allowed." };
        }
        if (!Number.isFinite(fileSize) || fileSize <= 0) {
            return { success: false, message: "The selected file appears to be empty." };
        }
        if (fileSize > MAX_SIZE) {
            return { success: false, message: "File exceeds 10MB" };
        }

        // Ensure the bucket, CORS policies, and read-policies are dynamically initialized
        await ensureStorageBucket();

        const rawExtension = fileName.includes(".") ? fileName.split(".").pop() : undefined;
        const mimeExtension = fileType.split("/").pop();
        const fileExtension = (rawExtension || mimeExtension || "bin")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "")
            .slice(0, 10) || "bin";

        const uniqueKey = `tenants/${currentUser.restaurantId}/recipes/${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 8)}.${fileExtension}`;

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: uniqueKey,
            ContentType: fileType,
            ContentLength: fileSize,
            // BUG FIX: Instruct S3 client to bypass modern SHA256 checksum payload checks.
            // This is mandatory for local MinIO / R2 emulations which do not implement AWS checksum checks.
        });

        const secondsExpiry = 300;

        // Generate pre-signed URL signing ONLY host and content-type.
        const uploadUrl = await getSignedUrl(s3Client, command, {
            expiresIn: secondsExpiry,
            signableHeaders: new Set(["host", "content-type"]),
        });

        return {
            success: true,
            message: "Upload URL generated successfully.",
            uploadUrl,
            fileKey: uniqueKey,
        };
    } catch (error) {
        const errorMessage = error instanceof Error
            ? error.message
            : "Failed to establish upload signatures.";

        return {
            success: false,
            message: errorMessage,
        };
    }
}