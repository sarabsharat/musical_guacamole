// actions/MediaActions.ts
"use server";

import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { z } from "zod";
import { getPresignedUploadUrl } from "@/lib/s3-service";
import {uploadRateLimiter} from "@/lib/RateLimiter/rate-limiter";
// 🚨 1. Import limiter

const uploadSchema = z.object({
    fileName: z.string().min(1),
    fileType: z.string().min(1),
    fileSize: z.number().int().positive(),
});

export async function getSecureUploadUrl(_mockUser: unknown, input: z.infer<typeof uploadSchema>) {
    try {
        // 1. Authenticate
        const session = await auth();
        if (!session?.user) {
            return { success: false, message: "You must be logged in." };
        }

        // 2. Role Check
        if (session.user.role !== Role.restaurant_owner) {
            return { success: false, message: "Only restaurant owners can upload images." };
        }

        const userId = session.user.id ? String(session.user.id) : "anonymous";

        // 🚨 3. CHECK RATE LIMITER
        const { success: rateLimitSuccess, remaining, reset } = await uploadRateLimiter.limit(userId);

        console.log("🔍 [Rate Limiter Debug]:", { userId, rateLimitSuccess, remaining });

        if (!rateLimitSuccess) {
            const secondsUntilReset = Math.ceil((reset - Date.now()) / 1000);
            return {
                success: false,
                message: `Upload limit exceeded. Try again in ${secondsUntilReset} seconds.`
            };
        }

        // 4. Validate input
        const validated = uploadSchema.safeParse(input);
        if (!validated.success) {
            return { success: false, message: validated.error.issues[0]?.message };
        }

        const { fileName, fileType, fileSize } = validated.data;

        // 5. Generate file key
        const parsedUserId = parseInt(session.user.id, 10);
        const timestamp = Date.now();
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
        const fileKey = `uploads/${parsedUserId}/${timestamp}-${sanitizedFileName}`;

        // 6. Get presigned URL
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