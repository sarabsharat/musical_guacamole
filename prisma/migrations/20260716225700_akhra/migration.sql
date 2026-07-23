/*
  Warnings:

  - The values [null] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `hasDedicatedAllergenZones` on the `KitchenControlProfile` table. All the data in the column will be lost.
  - You are about to drop the column `usesStandardizedRecipes` on the `KitchenControlProfile` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('platform_admin', 'restaurant_owner', 'nutritionist_auditor', 'jfda_officer');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
COMMIT;

-- AlterTable
ALTER TABLE "KitchenControlProfile" DROP COLUMN "hasDedicatedAllergenZones",
DROP COLUMN "usesStandardizedRecipes",
ADD COLUMN     "has_dedicated_allergen_zones" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "uses_standardized_recipes" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" DROP NOT NULL;
