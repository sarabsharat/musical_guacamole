// actions/MediaActions.ts
"use server";

import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { z } from "zod";
import { getPresignedUploadUrl } from "@/lib/s3-service";
import { uploadRateLimiter } from "@/lib/RateLimiter/rate-limiter";
import { headers } from "next/headers";

const uploadSchema = z.object({
    fileName: z.string().min(1),
    fileType: z.string().min(1),
    fileSize: z.number().int().positive(),
    context: z.enum(["onboarding", "general"]).optional().default("general"),
});

export async function getSecureUploadUrl(input: z.infer<typeof uploadSchema>) {
    try {
        const validated = uploadSchema.safeParse(input);
        if (!validated.success) {
            return { success: false, message: validated.error.issues[0]?.message };
        }

        const { fileName, fileType, fileSize, context } = validated.data;
        const isOnboarding = context === "onboarding";

        const session = await auth();
        const userId = session?.user?.id ? String(session.user.id) : null;
        const role = session?.user?.role;

        // Allow unauthenticated ONLY if onboarding
        if (!session && !isOnboarding) {
            return { success: false, message: "You must be logged in." };
        }

        // Role check (skip for onboarding)
        if (session && role !== Role.restaurant_owner && !isOnboarding) {
            return { success: false, message: "Only restaurant owners can upload images." };
        }

        // Rate limiting
        const rateLimitKey = userId ? `upload-${userId}` : `upload-onboarding-${(await headers()).get("x-forwarded-for") || "anonymous"}`;
        const { success: rateLimitSuccess, reset } = await uploadRateLimiter.limit(rateLimitKey);
        if (!rateLimitSuccess) {
            const secondsUntilReset = Math.ceil((reset - Date.now()) / 1000);
            return { success: false, message: `Upload limit exceeded. Try again in ${secondsUntilReset} seconds.` };
        }

        // File key
        const timestamp = Date.now();
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
        const ownerId = userId || "anonymous";
        const fileKey = isOnboarding
            ? `onboarding/${ownerId}/${timestamp}-${sanitizedFileName}`
            : `uploads/${userId}/${timestamp}-${sanitizedFileName}`;

        const result = await getPresignedUploadUrl({ fileKey, fileType, fileSize });
        if (!result.uploadUrl) throw new Error("Failed to generate upload URL.");

        return {
            success: true,
            uploadUrl: result.uploadUrl,
            fileKey: result.fileKey || fileKey,
            message: "Upload URL generated.",
        };
    } catch (error) {
        console.error("❌ [MediaAction] Error:", error);
        return { success: false, message: error instanceof Error ? error.message : "Failed to generate upload URL." };
    }
}