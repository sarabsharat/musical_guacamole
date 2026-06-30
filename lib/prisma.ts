import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// Next.js Hot-Reloading Singleton Pattern
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// 1. Create a standard Postgres connection pool using your existing .env URL
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 2. Wrap the pool in the official Prisma Adapter
const adapter = new PrismaPg(pool);

// 3. Pass the adapter to the client constructor
export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        adapter, // <-- THIS IS THE MAGIC FIX
        log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;