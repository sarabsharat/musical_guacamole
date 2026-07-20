import { prisma } from "@/lib/prisma";
import { requireJfdaAuth } from "@/lib/Authentication/RequireJfdaAuth";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, User } from "lucide-react";
import {CertifyButton} from "@/components/jfda/certify-button";

// 🚨 Notice the Promise type here
export default async function RestaurantDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    await requireJfdaAuth();

    // 🚨 1. Await the params before reading them
    const resolvedParams = await params;
    const restaurantId = parseInt(resolvedParams.id, 10);

    if (isNaN(restaurantId)) {
        console.log("❌ Invalid ID:", resolvedParams.id);
        notFound();
    }

    const restaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        include: {
            owner: true,
            recipes: true,
        }
    });

    if (!restaurant) {
        console.log("❌ Restaurant not found in DB for ID:", restaurantId);
        notFound();
    }

    return (
        // ... your JSX exactly as it was before ...
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{restaurant.business_name}</h1>
                    <p className="text-muted-foreground">Establishment Details & Applications</p>
                </div>
                <Badge className="text-sm py-1 px-3" variant="secondary">
                    {restaurant.cert_status}
                </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardContent className="pt-6 flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-full text-primary">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">Domain</p>
                            <p className="text-sm text-muted-foreground">{restaurant.slug}.yourdomain.com</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-full text-primary">
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">Owner</p>
                            <p className="text-sm text-muted-foreground">{restaurant.owner?.full_name}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Submitted Recipes</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="divide-y">
                        {restaurant.recipes.map((recipe) => (
                            <div key={recipe.id} className="py-4 flex items-center justify-between">
                                <div>
                                    <p className="font-medium">{recipe.meal_name}</p>
                                    <p className="text-sm text-muted-foreground">Status: {recipe.status}</p>
                                </div>
                                {recipe.status !== "APPROVED" && (
                                    <CertifyButton recipeId={recipe.id} restaurantId={restaurant.id} />
                                )}
                            </div>
                        ))}
                        {restaurant.recipes.length === 0 && (
                            <p className="py-4 text-center text-muted-foreground">No recipes submitted yet.</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}