-- Add missing fields to Part table
ALTER TABLE "Part" ADD COLUMN IF NOT EXISTS "revision" TEXT DEFAULT '1';
ALTER TABLE "Part" ADD COLUMN IF NOT EXISTS "manufacturerName" TEXT;
ALTER TABLE "Part" ADD COLUMN IF NOT EXISTS "unitOfMeasure" TEXT;
ALTER TABLE "Part" ADD COLUMN IF NOT EXISTS "customAttributes" JSONB;

-- Add missing fields to Assembly table  
ALTER TABLE "Assembly" ADD COLUMN IF NOT EXISTS "revision" TEXT DEFAULT '1';
ALTER TABLE "Assembly" ADD COLUMN IF NOT EXISTS "isOrderable" BOOLEAN DEFAULT false;
ALTER TABLE "Assembly" ADD COLUMN IF NOT EXISTS "customAttributes" JSONB;