-- CreateEnum
CREATE TYPE "QcItemType" AS ENUM ('PASS_FAIL', 'TEXT_INPUT', 'NUMERIC_INPUT', 'SINGLE_SELECT', 'MULTI_SELECT', 'DATE_INPUT', 'CHECKBOX');

-- CreateEnum
CREATE TYPE "QcStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED', 'REQUIRES_REVIEW');

-- CreateTable
CREATE TABLE "QcFormTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "appliesToProductFamily" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QcFormTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QcFormTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "checklistItem" TEXT NOT NULL,
    "itemType" "QcItemType" NOT NULL,
    "options" JSONB,
    "expectedValue" TEXT,
    "order" INTEGER NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "QcFormTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderQcResult" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "qcFormTemplateId" TEXT NOT NULL,
    "qcPerformedById" TEXT NOT NULL,
    "qcTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "overallStatus" "QcStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,

    CONSTRAINT "OrderQcResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderQcItemResult" (
    "id" TEXT NOT NULL,
    "orderQcResultId" TEXT NOT NULL,
    "qcFormTemplateItemId" TEXT NOT NULL,
    "resultValue" TEXT,
    "isConformant" BOOLEAN,
    "notes" TEXT,

    CONSTRAINT "OrderQcItemResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderQcResult_orderId_qcFormTemplateId_key" ON "OrderQcResult"("orderId", "qcFormTemplateId");

-- AddForeignKey
ALTER TABLE "QcFormTemplateItem" ADD CONSTRAINT "QcFormTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "QcFormTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderQcResult" ADD CONSTRAINT "OrderQcResult_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderQcResult" ADD CONSTRAINT "OrderQcResult_qcFormTemplateId_fkey" FOREIGN KEY ("qcFormTemplateId") REFERENCES "QcFormTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderQcResult" ADD CONSTRAINT "OrderQcResult_qcPerformedById_fkey" FOREIGN KEY ("qcPerformedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderQcItemResult" ADD CONSTRAINT "OrderQcItemResult_orderQcResultId_fkey" FOREIGN KEY ("orderQcResultId") REFERENCES "OrderQcResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderQcItemResult" ADD CONSTRAINT "OrderQcItemResult_qcFormTemplateItemId_fkey" FOREIGN KEY ("qcFormTemplateItemId") REFERENCES "QcFormTemplateItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
