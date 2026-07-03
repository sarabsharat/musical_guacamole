// lib/shared-types/audit.ts
export interface SubmitAuditPayload {
    restaurantId: number;
    hasDedicatedAllergenZones: boolean;
    usesStandardizedRecipes: boolean;
}