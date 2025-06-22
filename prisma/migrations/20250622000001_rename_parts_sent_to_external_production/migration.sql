-- AlterEnum
-- Update any existing orders first (if any exist)
UPDATE "Order" SET "orderStatus" = 'ORDER_CREATED' WHERE "orderStatus" = 'PARTS_SENT_WAITING_ARRIVAL';
UPDATE "OrderHistoryLog" SET "newStatus" = 'ORDER_CREATED' WHERE "newStatus" = 'PARTS_SENT_WAITING_ARRIVAL';
UPDATE "OrderHistoryLog" SET "oldStatus" = 'ORDER_CREATED' WHERE "oldStatus" = 'PARTS_SENT_WAITING_ARRIVAL';

-- Now alter the enum
ALTER TYPE "OrderStatus" RENAME VALUE 'PARTS_SENT_WAITING_ARRIVAL' TO 'SINK_BODY_EXTERNAL_PRODUCTION';

-- Update the orders back to the new status if they were temporarily set to ORDER_CREATED for migration
-- This step would be manual and should be done based on actual business requirements