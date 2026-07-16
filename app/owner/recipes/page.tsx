
import {RecipeCreateForm} from "@/components/owner/recipe-create-form";
import {requireOwnerAuth} from "@/lib/Authentication/RequireOwnerAuth";
import {serializePrisma} from "@/lib/serialize";
import prisma from "@/lib/prisma";

export default async function NewRecipePage() {
    // 1. 🚨 SECURITY: The un-hackable Auth Wall
    const { userId, restaurantId } = await requireOwnerAuth();

    // 2. Fetch reference ingredient library
    // This pulls the global JFDA verified ingredients so the user can select them in the form
    const references = await prisma.ingredientReference.findMany({
        orderBy: { name: "asc" }
    });

    // 3. Serialize the database objects to pass to the Client Component safely
    const serializedReferences = serializePrisma(references);

    // 4. Reconstruct the mock user for your existing Client Component
    const mockUser = { id: userId, restaurantId, role: "restaurant_owner" } as any;

    return (
        <div className="min-h-screen bg-neutral-100 p-8 text-black">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="pb-4 border-b">
                    <h1 className="text-3xl font-bold tracking-tight">Create Manual Recipe</h1>
                    <p className="text-muted-foreground mt-1">
                        Build a new menu item from scratch using the standardized ingredient database.
                    </p>
                </div>

                {/*
                  This assumes you have a manual creation form component.
                  If your edit form handles both editing and creating, you can swap the import
                  and pass empty recipe data here.
                */}
                <RecipeCreateForm
                    currentUser={mockUser}
                    references={serializedReferences}
                />
            </div>
        </div>
    );
}