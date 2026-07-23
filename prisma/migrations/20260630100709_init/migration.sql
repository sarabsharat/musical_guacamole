/*
  Warnings:

  - You are about to drop the column `updated_at` on the `RecipeVersion` table. All the data in the column will be lost.
  - You are about to drop the column `contact_phone` on the `Restaurant` table. All the data in the column will be lost.
  - You are about to drop the column `owner_role` on the `Restaurant` table. All the data in the column will be lost.
  - You are about to drop the `AuditLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `License` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Notification` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `image_url` to the `Recipe` table without a default value. This is not possible if the table is not empty.
  - Added the required column `preparation_notes` to the `Recipe` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_rest_id_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_user_id_fkey";

-- DropForeignKey
ALTER TABLE "License" DROP CONSTRAINT "License_restaurant_id_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_user_id_fkey";

-- DropForeignKey
ALTER TABLE "RecipeVersion" DROP CONSTRAINT "RecipeVersion_recipe_id_fkey";

-- DropForeignKey
ALTER TABLE "Restaurant" DROP CONSTRAINT "Restaurant_owner_id_owner_role_fkey";

-- DropIndex
DROP INDEX "User_id_role_key";

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "image_url" TEXT NOT NULL,
ADD COLUMN     "preparation_notes" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "RecipeVersion" DROP COLUMN "updated_at",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Restaurant" DROP COLUMN "contact_phone",
DROP COLUMN "owner_role";

-- DropTable
DROP TABLE "AuditLog";

-- DropTable
DROP TABLE "License";

-- DropTable
DROP TABLE "Notification";

-- CreateTable
CREATE TABLE "IngredientReference" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "calories_per_g" DECIMAL(65,30) NOT NULL,
    "protein_per_g" DECIMAL(65,30) NOT NULL,
    "carbs_per_g" DECIMAL(65,30) NOT NULL,
    "fat_per_g" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "IngredientReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeIngredient" (
    "id" SERIAL NOT NULL,
    "recipe_id" INTEGER NOT NULL,
    "ingredient_id" INTEGER NOT NULL,
    "user_stated_amount" TEXT NOT NULL,
    "normalized_grams" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IngredientReference_name_key" ON "IngredientReference"("name");

-- AddForeignKey
ALTER TABLE "Restaurant" ADD CONSTRAINT "Restaurant_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "IngredientReference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeVersion" ADD CONSTRAINT "RecipeVersion_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
