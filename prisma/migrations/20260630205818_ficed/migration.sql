-- CreateTable
CREATE TABLE "KitchenControlProfile" (
    "id" SERIAL NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "hasDedicatedAllergenZones" BOOLEAN NOT NULL DEFAULT false,
    "usesStandardizedRecipes" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KitchenControlProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KitchenControlProfile_restaurantId_key" ON "KitchenControlProfile"("restaurantId");

-- AddForeignKey
ALTER TABLE "KitchenControlProfile" ADD CONSTRAINT "KitchenControlProfile_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
