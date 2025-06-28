-- Fix Missing Assembly Records Script
-- This script adds the missing assembly records that are causing "Unknown" parts in BOMs

-- Add the missing generic assembly references that are used in order configurations
INSERT INTO "Assembly" ("AssemblyID", "name", "type", "categoryCode", "subcategoryCode", "isOrderable", "createdAt", "updatedAt") 
VALUES 
  (
    'HEIGHT-ADJUSTABLE', 
    'Height Adjustable Leg Kit (Generic Reference)', 
    'KIT', 
    '721', 
    '721.711', 
    false,
    NOW(),
    NOW()
  ),
  (
    'PERFORATED', 
    'Perforated Pegboard Kit (Generic Reference)', 
    'KIT', 
    '723', 
    '723.716', 
    false,
    NOW(),
    NOW()
  ),
  (
    'STANDARD-PEGBOARD', 
    'Standard Pegboard Kit (Generic Reference)', 
    'KIT', 
    '723', 
    '723.716', 
    false,
    NOW(),
    NOW()
  )
ON CONFLICT ("AssemblyID") DO UPDATE SET
  "name" = EXCLUDED."name",
  "updatedAt" = NOW();

-- Verify the insertions
SELECT "AssemblyID", "name", "type" 
FROM "Assembly" 
WHERE "AssemblyID" IN ('HEIGHT-ADJUSTABLE', 'PERFORATED', 'STANDARD-PEGBOARD');