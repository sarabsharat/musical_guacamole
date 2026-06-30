-- CreateEnum
CREATE TYPE "Role" AS ENUM ('platform_admin', 'restaurant_owner', 'nutritionist_auditor', 'jfda_officer');

-- CreateEnum
CREATE TYPE "CertStatus" AS ENUM ('NONE', 'PENDING', 'ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "CertLevel" AS ENUM ('LEVEL_1', 'LEVEL_2', 'LEVEL_3');

-- CreateEnum
CREATE TYPE "RecipeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'CERT_APPROVAL', 'CERT_REJECTION');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Restaurant" (
    "id" SERIAL NOT NULL,
    "business_name" TEXT NOT NULL,
    "address_line" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "cert_status" "CertStatus" NOT NULL DEFAULT 'NONE',
    "cert_level" "CertLevel" NOT NULL DEFAULT 'LEVEL_1',
    "owner_id" INTEGER NOT NULL,
    "owner_role" "Role" NOT NULL,

    CONSTRAINT "Restaurant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "License" (
    "id" SERIAL NOT NULL,
    "restaurant_id" INTEGER NOT NULL,
    "license_number" TEXT NOT NULL,
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "document_url" TEXT NOT NULL,

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" SERIAL NOT NULL,
    "meal_name" TEXT NOT NULL,
    "calories" DECIMAL(65,30) NOT NULL,
    "protein" DECIMAL(65,30) NOT NULL,
    "carbs" DECIMAL(65,30) NOT NULL,
    "total_fat" DECIMAL(65,30) NOT NULL,
    "status" "RecipeStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "restaurant_id" INTEGER NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeVersion" (
    "id" SERIAL NOT NULL,
    "recipe_id" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecipeVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "rest_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_id_role_key" ON "User"("id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "License_restaurant_id_key" ON "License"("restaurant_id");

-- AddForeignKey
ALTER TABLE "Restaurant" ADD CONSTRAINT "Restaurant_owner_id_owner_role_fkey" FOREIGN KEY ("owner_id", "owner_role") REFERENCES "User"("id", "role") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "License" ADD CONSTRAINT "License_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeVersion" ADD CONSTRAINT "RecipeVersion_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "Recipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_rest_id_fkey" FOREIGN KEY ("rest_id") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
