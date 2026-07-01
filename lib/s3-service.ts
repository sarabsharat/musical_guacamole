// lib/s3-service.ts
import {
    S3Client,
    CreateBucketCommand,
    HeadBucketCommand,
    PutBucketCorsCommand,
    PutBucketPolicyCommand
} from "@aws-sdk/client-s3";

// BUG FIX: this was the only place in the codebase with a safe fallback for
// NEXT_PUBLIC_MINIO_URL. `actions/media.ts` used to build its own S3Client
// with no fallback, so if the env var was ever missing/unset on the server
// the SDK silently fell back to a real AWS endpoint and every presigned PUT
// URL pointed at AWS instead of local MinIO, causing all uploads to fail.
// We now export a single client + bucket name and reuse them everywhere so
// there is exactly one source of truth for storage configuration.
export const STORAGE_ENDPOINT = process.env.NEXT_PUBLIC_MINIO_URL || "http://localhost:9000";
export const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "musical-guacamole";

export const s3Client = new S3Client({
    region: "me-central-1",
    endpoint: STORAGE_ENDPOINT,
    forcePathStyle: true, // MANDATORY for MinIO path-style buckets
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "sara_admin",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "12345678",
    },
    // BUG FIX: MinIO does not support AWS SDK v3's checksum headers.
    // Setting both to "IGNORE" prevents the SDK from adding x-amz-checksum-*
    // headers that MinIO rejects with "A header you provided implies functionality
    // that is not implemented". This is safe for development/local MinIO but
    // for production AWS S3, consider using "WHEN_REQUIRED" instead.
    requestChecksumCalculation: "IGNORE",
    responseChecksumValidation: "IGNORE",
});

/**
 * Ensures the target storage bucket exists and is properly configured
 * with Public Read and CORS policies for seamless browser uploads.
 *
 * BUG FIX: this used to swallow every error internally (try/catch that only
 * logged), so callers had no way to know initialization failed. It now
 * throws so callers (see `ensureStorageBucket` below) can surface a real
 * error to the user instead of a generic "upload failed" message.
 */
export async function initializeStorageBucket() {
    const bucketName = BUCKET_NAME;
    console.log(`🤖 Verifying local storage bucket: "${bucketName}"...`);

    // 1. Check if the bucket already exists
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
    // Without this step, the browser's preflight OPTIONS request to MinIO is
    // rejected and every direct-to-S3 upload fails with a CORS error before
    // it ever reaches application code.
    console.log(`🔧 Applying browser CORS policy to bucket...`);
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

    // 3. Apply a Public Read Policy so uploaded images are visible to client browsers
    console.log(`🔧 Applying read-only public access policy to bucket...`);
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

    console.log(`🎉 Storage initialization completed successfully.`);
}

// BUG FIX: previously `initializeStorageBucket()` only ever ran from
// `prisma/seed.ts`. If a developer spun up docker-compose but never ran the
// seed script (or the MinIO volume was reset), the bucket/CORS/policy would
// never be created and every image upload in the owner submit form would
// fail with an opaque "Media upload failure." error. We now lazily run
// initialization on the first real upload attempt too, and cache the
// in-flight/resolved promise so subsequent uploads in the same server
// process don't repeat the 3 setup network calls.
let bucketReadyPromise: Promise<void> | null = null;

export function ensureStorageBucket(): Promise<void> {
    if (!bucketReadyPromise) {
        bucketReadyPromise = initializeStorageBucket().catch((err) => {
            // Don't cache a permanent failure — let the next upload attempt retry
            // (e.g. in case MinIO was still starting up).
            bucketReadyPromise = null;
            throw err;
        });
    }
    return bucketReadyPromise;
}
