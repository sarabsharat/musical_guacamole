// lib/shared-types/api.ts
export type PreSignedUrlResponse = {
    success: boolean;
    message: string;
    uploadUrl?: string;
    fileKey?: string;
};