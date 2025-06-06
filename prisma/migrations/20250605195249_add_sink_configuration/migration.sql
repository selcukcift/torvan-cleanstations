-- CreateTable
CREATE TABLE "SinkConfiguration" (
    "id" TEXT NOT NULL,
    "buildNumber" TEXT NOT NULL,
    "sinkModelId" TEXT NOT NULL,
    "width" INTEGER,
    "length" INTEGER,
    "legsTypeId" TEXT,
    "feetTypeId" TEXT,
    "workflowDirection" TEXT,
    "pegboard" BOOLEAN NOT NULL DEFAULT false,
    "pegboardTypeId" TEXT,
    "pegboardColorId" TEXT,
    "hasDrawersAndCompartments" BOOLEAN NOT NULL DEFAULT false,
    "drawersAndCompartments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "controlBoxId" TEXT,
    "orderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SinkConfiguration_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SinkConfiguration" ADD CONSTRAINT "SinkConfiguration_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
