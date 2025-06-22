-- Add procurementData JSON field to Order table
ALTER TABLE "Order" ADD COLUMN "procurementData" JSONB;