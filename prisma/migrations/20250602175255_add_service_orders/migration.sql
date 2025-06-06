-- CreateEnum
CREATE TYPE "ServiceOrderStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ORDERED', 'RECEIVED');

-- CreateTable
CREATE TABLE "ServiceOrder" (
    "id" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "requestTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ServiceOrderStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "notes" TEXT,
    "procurementNotes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceOrderItem" (
    "id" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "quantityRequested" INTEGER NOT NULL,
    "quantityApproved" INTEGER,
    "notes" TEXT,

    CONSTRAINT "ServiceOrderItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOrderItem" ADD CONSTRAINT "ServiceOrderItem_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOrderItem" ADD CONSTRAINT "ServiceOrderItem_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("PartID") ON DELETE RESTRICT ON UPDATE CASCADE;
