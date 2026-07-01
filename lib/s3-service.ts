// lib/s3-service.ts
import {
    S3Client,
    CreateBucketCommand,
    HeadBucketCommand,
    PutBucketCorsCommand,
    PutBucketPolicyCommand,
    S3ClientConfig,
} from "@aws-sdk/client-s3";

// Determine local vs production endpoints
export const STORAGE_ENDPOINT = process.env.NEXT_PUBLIC_MINIO_URL || "http://localhost:9000";
export const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "musical-guacamole";

// Build client configuration conditionally so we avoid passing
// checksum-related options to environments that don't support them.
const s3Config: Partial<S3ClientConfig> = {
    region: "me-central-1",
    endpoint: STORAGE_ENDPOINT,
    forcePathStyle: true, // MANDATORY for MinIO path-style buckets
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "sara_admin",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "12345678",
    },
};

// Only enable checksum behavior for real AWS endpoints. Local MinIO
// and many emulators do not implement checksum features and will
// reject requests that include x-amz-checksum-* headers. We detect
// this roughly by the STORAGE_ENDPOINT value; adjust as needed.
if (!STORAGE_ENDPOINT.includes("localhost") && !STORAGE_ENDPOINT.includes("127.0.0.1")) {
    s3Config.requestChecksumCalculation = "WHEN_REQUIRED";
    s3Config.responseChecksumValidation = "WHEN_REQUIRED";
}

export const s3Client = new S3Client(s3Config);

/**
 * Ensures the target storage bucket exists.
 * CORS and Bucket Policies are applied defensively to prevent local MinIO / S3 emulators
 * from crashing the server-side pre-signing process.
 */
export async function initializeStorageBucket() {
    const bucketName = BUCKET_NAME;
    console.log(`🤖 Verifying local storage bucket: "${bucketName}"...`);

    // 1. Check if the bucket already exists. If not, create it.
    try {
        await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
        console.log(`👍 Bucket "${bucketName}" exists.`);
    } catch (headErr: unknown) {
        const err = headErr as { name?: string; $metadata?: { httpStatusCode?: number } };
        if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
            console.log(`➕ Creating missing bucket: "${bucketName}"...`);
            await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
        } else {
            throw headErr;
        }
    }

    // 2. Configure CORS to allow direct PUT uploads from the client browser.
    // We wrap this defensively because some local MinIO setups or serverless gateways
    // always return a 501 "NotImplemented" error for S3 PutBucketCors requests.
    console.log(`🔧 Applying browser CORS policy to bucket...`);
    try {
        await s3Client.send(new PutBucketCorsCommand({
            Bucket: bucketName,
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedHeaders: ["*"],
                        AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
                        AllowedOrigins: ["*"], // Restrict to specific domains in production
                        ExposeHeaders: ["ETag"],
                        MaxAgeSeconds: 3000
                    }
                ]
            }
        }));
        console.log(`👍 Bucket CORS policy applied.`);
    } catch (corsErr: unknown) {
        const err = corsErr as { message?: string };
        console.warn(
            `⚠️ S3 PutBucketCors skipped or not implemented by S3 server: ${err.message || corsErr}`
        );
    }

    // 3. Apply a Public Read Policy so uploaded images are visible to client browsers.
    // This is also wrapped defensively to handle local emulator limitations.
    console.log(`🔧 Applying read-only public access policy to bucket...`);
    try {
        const publicReadPolicy = {
            Version: "2012-10-17",
            Statement: [
                {
                    Sid: "PublicReadGetObject",
                    Effect: "Allow",
                    Principal: "*",
                    Action: ["s3:GetObject"],
                    Resource: [`arn:aws:s3:::${bucketName}/*`]
                }
            ]
        };

        await s3Client.send(new PutBucketPolicyCommand({
            Bucket: bucketName,
            Policy: JSON.stringify(publicReadPolicy)
        }));
        console.log(`👍 Public read policy applied.`);
    } catch (policyErr: unknown) {
        const err = policyErr as { message?: string };
        console.warn(
            `⚠️ S3 PutBucketPolicy skipped or not implemented by S3 server: ${err.message || policyErr}`
        );
    }

    console.log(`🎉 Storage initialization check completed.`);
}

let bucketReadyPromise: Promise<void> | null = null;

export function ensureStorageBucket(): Promise<void> {
    if (!bucketReadyPromise) {
        bucketReadyPromise = initializeStorageBucket().catch((err) => {
            // Reset to allow retry on next attempt
            bucketReadyPromise = null;
            throw err;
        });
    }
    return bucketReadyPromise;
}