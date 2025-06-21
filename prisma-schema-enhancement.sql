-- Single Source of Truth Enhancement for Order Schema
-- This adds optional tracking for the generated JSON files

-- Option 1: Add fields to existing Order table (Recommended)
ALTER TABLE "Order" ADD COLUMN "singleSourceOfTruthPath" TEXT;
ALTER TABLE "Order" ADD COLUMN "singleSourceOfTruthGeneratedAt" TIMESTAMP;
ALTER TABLE "Order" ADD COLUMN "singleSourceOfTruthVersion" TEXT DEFAULT '1.0.0';

-- Option 2: Create separate table for detailed tracking (Alternative)
CREATE TABLE "OrderSingleSourceOfTruth" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "filePath" TEXT NOT NULL,
  "fileSize" INTEGER,
  "bomItemCount" INTEGER,
  "version" TEXT NOT NULL DEFAULT '1.0.0',
  "generatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "regeneratedAt" TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, OUTDATED, ARCHIVED
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,

  CONSTRAINT "OrderSingleSourceOfTruth_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint
ALTER TABLE "OrderSingleSourceOfTruth" ADD CONSTRAINT "OrderSingleSourceOfTruth_orderId_fkey" 
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add unique constraint (one active record per order)
CREATE UNIQUE INDEX "OrderSingleSourceOfTruth_orderId_status_unique" 
  ON "OrderSingleSourceOfTruth"("orderId", "status") 
  WHERE "status" = 'ACTIVE';

-- Add index for performance
CREATE INDEX "OrderSingleSourceOfTruth_orderId_idx" ON "OrderSingleSourceOfTruth"("orderId");
CREATE INDEX "OrderSingleSourceOfTruth_generatedAt_idx" ON "OrderSingleSourceOfTruth"("generatedAt");