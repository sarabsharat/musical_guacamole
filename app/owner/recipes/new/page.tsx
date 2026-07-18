import { RecipeCreateForm } from "@/components/owner/recipe-create-form";
import { requireOwnerAuth } from "@/lib/Authentication/RequireOwnerAuth";
import { serializePrisma } from "@/lib/serialize";
import prisma from "@/lib/prisma";

export default async function NewRecipePage() {
    // 1. 🚨 SECURITY: Auth Wall
    const { userId, restaurantId } = await requireOwnerAuth();

    // 2. Fetch ingredient library
    const references = await prisma.ingredientReference.findMany({
        orderBy: { name: "asc" },
    });

    // 3. Serialize for client component
    const serializedReferences = serializePrisma(references);

    // 4. Mock user for client component
    const mockUser = { id: userId, restaurantId, role: "restaurant_owner" } as any;

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="mx-auto max-w-4xl space-y-6">
                {/* Page Header */}
                <div className="border-b border-border pb-4">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        Create Manual Recipe
                    </h1>
                    <p className="mt-1 text-muted-foreground">
                        Build a new menu item from scratch using the standardized ingredient database.
                    </p>
                </div>

                {/* Recipe Form */}
                <RecipeCreateForm
                    currentUser={mockUser}
                    references={serializedReferences}
                />
            </div>
        </div>
    );
}