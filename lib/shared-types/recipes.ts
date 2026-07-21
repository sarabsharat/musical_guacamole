import { RecipeStatus } from "@prisma/client";
export type { UpdateRecipePayload } from "@/lib/validations/recipe-schema";

export interface RecipeIngredient {
    id?: number;
    ingredient_item?: {
        name?: string | null;
    } | null;
    user_stated_amount?: string | null;
    normalized_grams?: number | null;
    ingredient_id?: number | null;
}

export interface Recipe {
    id: number;
    meal_name: string;
    preparation_notes: string;
    image_url?: string | null;
    ingredients?: RecipeIngredient[] | null;
    calories?: number;
    protein?: number;
    carbs?: number;
    total_fat?: number;
    status?: RecipeStatus;
    rejection_reason?: string | null;
    detected_allergens?: string[];
    versions?: RecipeVersion[];
    created_at: string;
}

export interface RecipeVersion {
    id: number;
    created_at: string;
    snapshot: any;
}



export interface FetchRecipesQuery {
    status?: RecipeStatus;
    search?: string;
    page: number;
    limit: number;
}

export interface RecipeSnapshot {
    meal_name: string;
    image_url: string;
    preparation_notes: string;
    calories: string | number;
    protein: string | number;
    carbs: string | number;
    total_fat: string | number;
    detected_allergens?: string[];
    ingredients?: Array<{
        ingredient_id?: number;
        name?: string;
        user_stated_amount?: string;
        amount?: string;
        normalized_grams?: string | number;
        weight_g?: string | number;
    }>;
}

export interface FetchRecipesQuery {
    page: number;
    limit: number;
    search?: string;
    status?: RecipeStatus;
    allergens?: string[];
    calMin?: number;
    calMax?: number;
}