/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Restaurant` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[custom_domain]` on the table `Restaurant` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[owner_id]` on the table `Restaurant` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `Restaurant` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "custom_domain" TEXT,
ADD COLUMN     "plan_tier" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN     "slug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_slug_key" ON "Restaurant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_custom_domain_key" ON "Restaurant"("custom_domain");

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_owner_id_key" ON "Restaurant"("owner_id");
