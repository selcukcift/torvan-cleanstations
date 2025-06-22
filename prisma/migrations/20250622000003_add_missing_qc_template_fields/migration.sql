-- Add missing fields to QcFormTemplateItem table
ALTER TABLE "QcFormTemplateItem" ADD COLUMN IF NOT EXISTS "applicabilityCondition" TEXT;
ALTER TABLE "QcFormTemplateItem" ADD COLUMN IF NOT EXISTS "defaultValue" TEXT;  
ALTER TABLE "QcFormTemplateItem" ADD COLUMN IF NOT EXISTS "notesPrompt" TEXT;
ALTER TABLE "QcFormTemplateItem" ADD COLUMN IF NOT EXISTS "relatedAssemblyId" TEXT;
ALTER TABLE "QcFormTemplateItem" ADD COLUMN IF NOT EXISTS "relatedPartNumber" TEXT;
ALTER TABLE "QcFormTemplateItem" ADD COLUMN IF NOT EXISTS "repeatPer" TEXT;