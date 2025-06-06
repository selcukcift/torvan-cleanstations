-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('ORDER_CREATED', 'PARTS_SENT_WAITING_ARRIVAL', 'READY_FOR_PRE_QC', 'READY_FOR_PRODUCTION', 'TESTING_COMPLETE', 'PACKAGING_COMPLETE', 'READY_FOR_FINAL_QC', 'READY_FOR_SHIP', 'SHIPPED');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SERVICE_DEPARTMENT';

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "buildNumbers" TEXT[],
    "customerName" TEXT NOT NULL,
    "projectName" TEXT,
    "salesPerson" TEXT NOT NULL,
    "wantDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "language" TEXT NOT NULL DEFAULT 'EN',
    "orderStatus" "OrderStatus" NOT NULL DEFAULT 'ORDER_CREATED',
    "currentAssignee" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BasinConfiguration" (
    "id" TEXT NOT NULL,
    "buildNumber" TEXT NOT NULL,
    "basinTypeId" TEXT NOT NULL,
    "basinSizePartNumber" TEXT,
    "basinCount" INTEGER NOT NULL DEFAULT 1,
    "addonIds" TEXT[],
    "orderId" TEXT NOT NULL,

    CONSTRAINT "BasinConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaucetConfiguration" (
    "id" TEXT NOT NULL,
    "buildNumber" TEXT NOT NULL,
    "faucetTypeId" TEXT NOT NULL,
    "faucetQuantity" INTEGER NOT NULL DEFAULT 1,
    "faucetPlacement" TEXT,
    "orderId" TEXT NOT NULL,

    CONSTRAINT "FaucetConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SprayerConfiguration" (
    "id" TEXT NOT NULL,
    "buildNumber" TEXT NOT NULL,
    "hasSpray" BOOLEAN NOT NULL DEFAULT false,
    "sprayerTypeIds" TEXT[],
    "sprayerQuantity" INTEGER NOT NULL DEFAULT 0,
    "sprayerLocations" TEXT[],
    "orderId" TEXT NOT NULL,

    CONSTRAINT "SprayerConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SelectedAccessory" (
    "id" TEXT NOT NULL,
    "buildNumber" TEXT NOT NULL,
    "assemblyId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "orderId" TEXT NOT NULL,

    CONSTRAINT "SelectedAccessory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssociatedDocument" (
    "id" TEXT NOT NULL,
    "docName" TEXT NOT NULL,
    "docURL" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "docType" TEXT,
    "orderId" TEXT NOT NULL,

    CONSTRAINT "AssociatedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bom" (
    "id" TEXT NOT NULL,
    "buildNumber" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderId" TEXT NOT NULL,

    CONSTRAINT "Bom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BomItem" (
    "id" TEXT NOT NULL,
    "partIdOrAssemblyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "itemType" TEXT NOT NULL,
    "category" TEXT,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    "bomId" TEXT NOT NULL,

    CONSTRAINT "BomItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderHistoryLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT,
    "notes" TEXT,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "OrderHistoryLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "linkToOrder" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "type" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recipientId" TEXT NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_poNumber_key" ON "Order"("poNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Order_poNumber_buildNumbers_key" ON "Order"("poNumber", "buildNumbers");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BasinConfiguration" ADD CONSTRAINT "BasinConfiguration_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaucetConfiguration" ADD CONSTRAINT "FaucetConfiguration_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SprayerConfiguration" ADD CONSTRAINT "SprayerConfiguration_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectedAccessory" ADD CONSTRAINT "SelectedAccessory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssociatedDocument" ADD CONSTRAINT "AssociatedDocument_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bom" ADD CONSTRAINT "Bom_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomItem" ADD CONSTRAINT "BomItem_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "Bom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomItem" ADD CONSTRAINT "BomItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "BomItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderHistoryLog" ADD CONSTRAINT "OrderHistoryLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderHistoryLog" ADD CONSTRAINT "OrderHistoryLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_linkToOrder_fkey" FOREIGN KEY ("linkToOrder") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
