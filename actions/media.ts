"use server";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { assertUserAccess, SessionUser } from "@/lib/security";
import { Role } from "@prisma/client";

const isLocalDev = process.env.NODE_ENV === "development";

const s3 = new S3Client({
    region: process.env.AWS_REGION || "me-central-1",
    endpoint: isLocalDev ? "http://localhost:9000" : undefined,
    forcePathStyle: isLocalDev,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
});

export type PreSignedUrlResponse = {
    success: boolean;
    message: string;
    uploadUrl?: string;
    fileKey?: string;
};

export async function getSecureUploadUrl(
    currentUser: SessionUser,
    fileName: string,
    fileType: string,
    fileSize: number
): Promise<PreSignedUrlResponse> {
    // 🚨 GUARDRAIL OUTSIDE THE TRY/CATCH 🚨
    await assertUserAccess(currentUser, [Role.restaurant_owner], currentUser.restaurantId);

    if (!currentUser.restaurantId) {
        throw new Error("Security Violation: No tenant context found.");
    }

    try {
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedTypes.includes(fileType)) {
            return { success: false, message: "Invalid file type" };
        }
        const MAX_SIZE = 10 * 1024 * 1024;
        if (fileSize > MAX_SIZE) {
            return { success: false, message: "File exceeds 10MB" };
        }

        const fileExtension = fileName.split(".").pop();

        const uniqueKey = `tenants/${currentUser.restaurantId}/recipes/${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 8)}.${fileExtension}`;

        const command = new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME || "musical-guacamole",
            Key: uniqueKey,
            ContentType: fileType,
        });

        const secondsExpiry = 300;
        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: secondsExpiry });

        return {
            success: true,
            message: "Successfully uploaded",
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