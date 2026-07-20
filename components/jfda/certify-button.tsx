"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { certifyRecipeApplication } from "@/actions/JfdaActions"; // Adjust path if needed

interface CertifyButtonProps {
    recipeId: number;
    restaurantId: number;
}

export function CertifyButton({ recipeId, restaurantId }: CertifyButtonProps) {
    const [isPending, setIsPending] = useState(false);

    const handleCertify = async () => {
        setIsPending(true);

        try {
            // We pass null for the mockUser parameter since your action uses requireJfdaAuth() inside
            const result = await certifyRecipeApplication(null, {
                recipeId,
                restaurantId,
            });

            if (result.success) {
                toast.success("Certification Complete", {
                    description: result.message
                });
            } else {
                toast.error("Certification Failed", {
                    description: result.message
                });
            }
        } catch (error) {
            toast.error("Unexpected Error", {
                description: "Something went wrong while processing the certification."
            });
        } finally {
            setIsPending(false);
        }
    };

    return (
        <Button
            onClick={handleCertify}
            disabled={isPending}
            size="sm"
            className="bg-[var(--protein)] hover:bg-[var(--protein)]/90 text-white cursor-pointer"
        >
            {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Certify Application
        </Button>
    );
}