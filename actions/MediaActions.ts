// actions/MediaActions.ts
"use server";

import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { z } from "zod";
import { getPresignedUploadUrl } from "@/lib/s3-service"; // adjust import if needed

const uploadSchema = z.object({
    fileName: z.string().min(1),
    fileType: z.string().min(1),
    fileSize: z.number().int().positive(),
});

export async function getSecureUploadUrl(_mockUser: unknown, input: z.infer<typeof uploadSchema>) {
    try {
        // 1. Authenticate without redirect
        const session = await auth();
        if (!session?.user) {
            return { success: false, message: "You must be logged in." };
        }

        // 2. Only restaurant owners can upload (other roles may be added later)
        if (session.user.role !== Role.restaurant_owner) {
            return { success: false, message: "Only restaurant owners can upload images." };
        }

        // 3. Validate input
        const validated = uploadSchema.safeParse(input);
        if (!validated.success) {
            return { success: false, message: validated.error.issues[0]?.message };
        }

        const { fileName, fileType, fileSize } = validated.data;

        // 4. Generate a unique file key (you can include user ID even if restaurantId is null)
        const userId = parseInt(session.user.id, 10);
        const timestamp = Date.now();
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
        const fileKey = `uploads/${userId}/${timestamp}-${sanitizedFileName}`;

        // 5. Get presigned URL from your S3/MinIO service
        //    This function should return { uploadUrl, fileKey } or throw an error
        const result = await getPresignedUploadUrl({
            fileKey,
            fileType,
            fileSize,
        });

        if (!result.uploadUrl) {
            throw new Error("Failed to generate upload URL.");
        }

        return {
            success: true,
            uploadUrl: result.uploadUrl,
            fileKey: result.fileKey || fileKey,
            message: "Upload URL generated.",
        };
    } catch (error) {
        console.error("❌ [MediaAction] Error:", error);
        return {
            success: false,
            message: error instanceof Error ? error.message : "Failed to generate upload URL.",
        };
    }
}