import { headers } from "next/headers";
import { LoginForm } from "@/components/auth/login-form";
import {getPublicRestaurantBySlug} from "@/actions/PublicActions";

export default async function LoginPage() {
    const host = (await headers()).get("host") || "";
    const hostname = host.split(":")[0]; // remove port

    const parts = hostname.split(".");
    let subdomain = null;

    // If we are on a subdomain like "asd.localhost" or "asd.example.com"
    // For localhost, parts = ["asd","localhost"] (length 2)
    // For production, parts = ["asd","example","com"] (length 3+)
    if (parts.length >= 2 && parts[0] !== "www" && parts[0] !== "localhost") {
        subdomain = parts[0];
    }

    let restaurant = null;
    if (subdomain) {
        restaurant = await getPublicRestaurantBySlug(subdomain);
    }

    const bgStyle = restaurant?.background_image_url
        ? {
            backgroundImage: `url(${restaurant.background_image_url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
        }
        : {};

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center p-4"
            style={bgStyle}
        >
            <div className="bg-background/90 dark:bg-background/90 p-6 rounded-lg shadow-lg max-w-md w-full">
                {restaurant?.logo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={restaurant.logo_url}
                        alt={restaurant.business_name}
                        className="h-16 w-auto mx-auto mb-4"
                    />
                )}
                <LoginForm />
            </div>
        </div>
    );
}