-- CreateTable
CREATE TABLE "PetInventoryItem" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT,
    "item" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Ball Games',
    "qty" INTEGER NOT NULL DEFAULT 0,
    "qtyIssued" INTEGER NOT NULL DEFAULT 0,
    "qtyDamaged" INTEGER NOT NULL DEFAULT 0,
    "minQty" INTEGER NOT NULL DEFAULT 0,
    "condition" TEXT NOT NULL DEFAULT 'Good',
    "location" TEXT NOT NULL DEFAULT '',
    "lastChecked" TEXT NOT NULL DEFAULT '',
    "expiryDate" TEXT NOT NULL DEFAULT '',
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PetInventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PetEquipmentRequest" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'Issue',
    "item" TEXT NOT NULL,
    "itemId" TEXT,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "requestedBy" TEXT NOT NULL DEFAULT '',
    "purpose" TEXT NOT NULL DEFAULT '',
    "date" TEXT NOT NULL DEFAULT '',
    "neededBy" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PetEquipmentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PetInventoryItem_schoolId_idx" ON "PetInventoryItem"("schoolId");

-- CreateIndex
CREATE INDEX "PetEquipmentRequest_schoolId_idx" ON "PetEquipmentRequest"("schoolId");

-- CreateIndex
CREATE INDEX "PetEquipmentRequest_itemId_idx" ON "PetEquipmentRequest"("itemId");
