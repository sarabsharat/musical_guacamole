-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('PROCESSING', 'RESOLVED', 'FAILED');

-- AlterTable
ALTER TABLE "IngredientReference" ADD COLUMN     "allergens" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "detected_allergens" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "RecipeDraft" (
    "id" SERIAL NOT NULL,
    "restaurant_id" INTEGER NOT NULL,
    "raw_input_text" TEXT NOT NULL,
    "image_url" TEXT,
    "extracted_json" JSONB,
    "status" "DraftStatus" NOT NULL DEFAULT 'PROCESSING',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecipeDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "actor_id" INTEGER NOT NULL,
    "restaurant_id" INTEGER,
    "recipe_id" INTEGER,
    "action" TEXT NOT NULL,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RecipeDraft" ADD CONSTRAINT "RecipeDraft_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
