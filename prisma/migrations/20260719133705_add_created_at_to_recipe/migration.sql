-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('NOT_ONBOARDED', 'IN_PROCESS', 'FULLY_ONBOARDED', 'REJECTED');

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "JordanDirectory" (
    "id" SERIAL NOT NULL,
    "business_name" TEXT NOT NULL,
    "city" TEXT,
    "contact_number" TEXT,
    "estimated_size" TEXT,
    "status" "OnboardingStatus" NOT NULL DEFAULT 'NOT_ONBOARDED',
    "active_tenant_id" INTEGER,

    CONSTRAINT "JordanDirectory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JordanDirectory_active_tenant_id_key" ON "JordanDirectory"("active_tenant_id");

-- AddForeignKey
ALTER TABLE "JordanDirectory" ADD CONSTRAINT "JordanDirectory_active_tenant_id_fkey" FOREIGN KEY ("active_tenant_id") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
