import { z } from "zod";

export const revokeSchema = z.object({
    restaurantId: z.number().int().positive(),
    reason: z.string().min(5, "A formal regulatory revocation reason is mandatory."),
});