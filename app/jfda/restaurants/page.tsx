import { prisma } from "@/lib/prisma";
import { requireJfdaAuth } from "@/lib/Authentication/RequireJfdaAuth";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function RestaurantListPage() {
    // Ensure only authorized users (like JFDA) can view this master list
    await requireJfdaAuth();

    const restaurants = await prisma.restaurant.findMany({
        orderBy: { business_name: 'asc' },
        include: {
            owner: { select: { full_name: true, email: true } },
            recipes: { select: { id: true } } // Just to get a count
        }
    });

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Restaurants Registry</h1>
                <p className="text-muted-foreground">Directory of all registered establishments.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {restaurants.map((restaurant) => (
                    <Link key={restaurant.id} href={`/restaurants/${restaurant.id}`}>
                        <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle>{restaurant.business_name}</CardTitle>
                                    <Badge variant="outline">{restaurant.cert_status}</Badge>
                                </div>
                                <CardDescription>{restaurant.owner.full_name}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Submitted Recipes: {restaurant.recipes.length}
                                </p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}