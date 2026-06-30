// src/lib/serialize.ts
import { Prisma } from "@prisma/client";

/**
 * Recursively converts non-serializable objects (such as Prisma.Decimal and Dates)
 * into plain primitives (numbers, strings) so they can pass safely across
 * the Next.js Server-to-Client component boundaries.
 */
export function serializePrisma<T>(val: T): any {
    if (val === null || val === undefined) {
        return val;
    }

    // Convert Prisma.Decimal to standard JavaScript numbers
    if (val instanceof Prisma.Decimal) {
        return val.toNumber();
    }

    // Convert Date objects to standard ISO strings
    if (val instanceof Date) {
        return val.toISOString();
    }

    // Recursively process Arrays
    if (Array.isArray(val)) {
        return val.map((item) => serializePrisma(item));
    }

    // Recursively process nested Objects
    if (typeof val === "object") {
        const plainObj: Record<string, any> = {};
        for (const key in val) {
            if (Object.prototype.hasOwnProperty.call(val, key)) {
                plainObj[key] = serializePrisma(val[key]);
            }
        }
        return plainObj;
    }

    return val;
}