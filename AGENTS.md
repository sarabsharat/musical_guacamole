<!-- BEGIN:nextjs-agent-rules -->

# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.

<!-- END:nextjs-agent-rules -->

1. Security & Authentication
   The 3-Layer Security Protocol: Every single Server Action you write or modify MUST include: 1) The Server-Side Auth Wall, 2) Zod Schema Validation, and 3) Prisma Tenant Isolation (e.g., strictly filtering by restaurant_id).

Auth Walls: Never use generic or legacy session fetching. Always import and execute the specific Auth Wall for the required role (e.g., requireOwnerAuth(), requireAdminAuth(), requireJfdaAuth()).

Zero Client Trust: Never trust IDs, roles, or tenant parameters passed from a Client Component payload. Always extract userId and restaurantId directly from the server-side Auth Wall.

2. Database & Prisma
   Immutable Versioning: Never DELETE or overwrite active records if they require audit logging (like recipes). Archive the old version by changing its status and create a new record.

Atomic Transactions: Any operation that modifies more than one table simultaneously (e.g., updating a recipe and its related ingredients) MUST be wrapped in a secure prisma.$transaction.

Strict Typing: Rely entirely on Prisma's generated types or the project's @/lib/shared-types.ts. The use of any is strictly forbidden unless bypassing a temporary external library bug.

3. Next.js App Router Conventions
   Server Actions: All database mutations must happen in Server Actions marked with "use server". Never attempt to call Prisma directly from a Client Component.

Routing: Strictly adhere to the Next.js App Router (src/app). Ensure secure routes are properly nested (e.g., /owner/..., /admin/...).

Client Components: Default to Server Components. Only use "use client" at the very top of a file when React hooks (useState, useEffect, useMemo) or interactive DOM elements are explicitly required.

4. UI & Error Handling
   Component Library: Exclusively use Shadcn UI components and Tailwind CSS for styling. Do not introduce raw CSS modules.

Icons: Use lucide-react for all iconography.

Graceful Errors: Never use native browser alert(). Always surface errors gracefully using Shadcn's <Alert variant="destructive"> components or toast notifications.