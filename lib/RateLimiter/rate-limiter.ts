// lib/rate-limiter.ts
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// Explicitly pass env variables to ensure client initialization
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const createRateLimiter = (
    namespace: string,
    requests: number,
    window: "60 s" | "1 m" | "5 m" | "1 h" | "1 d"
) => {
    return new Ratelimit({
        redis: redis,
        limiter: Ratelimit.slidingWindow(requests, window),
        analytics: true,
        prefix: `ratelimit:${namespace}`,
    });
};

// Specific limiters based on your tiers
export const apiRateLimiter = createRateLimiter("api", 100, "1 h");
export const loginRateLimiter = createRateLimiter("auth:login", 5, "5 m");
export const uploadRateLimiter = createRateLimiter("upload", 2, "1 m"); // 2 uploads per 1 minute
export const aiRateLimiter = createRateLimiter("ai:gemini", 5, "1 d");
export const recipeCreateLimiter = createRateLimiter("recipes:create", 10, "1 d");
export const deleteDraftRateLimiter = createRateLimiter("drafts:delete", 5, "60 s");