/*
  Warnings:

  - You are about to drop the column `has_dedicated_allergen_zones` on the `KitchenControlProfile` table. All the data in the column will be lost.
  - You are about to drop the column `uses_standardized_recipes` on the `KitchenControlProfile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "KitchenControlProfile" DROP COLUMN "has_dedicated_allergen_zones",
DROP COLUMN "uses_standardized_recipes",
ADD COLUMN     "hasDedicatedAllergenZones" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "usesStandardizedRecipes" BOOLEAN NOT NULL DEFAULT false;
