-- CreateEnum
CREATE TYPE "ProductionChecklistStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'APPROVED');

-- CreateEnum
CREATE TYPE "ProductionDocType" AS ENUM ('CHECKLIST_REPORT', 'COMPLETION_CERTIFICATE', 'QC_REPORT', 'COMPLIANCE_PACKAGE', 'PRODUCTION_SUMMARY');

-- CreateTable
CREATE TABLE "ProductionChecklist" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "buildNumber" TEXT,
    "jobId" TEXT NOT NULL,
    "sections" JSONB NOT NULL,
    "signatures" JSONB NOT NULL,
    "status" "ProductionChecklistStatus" NOT NULL DEFAULT 'DRAFT',
    "performedBy" TEXT NOT NULL,
    "performedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ProductionChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionTask" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "buildNumber" TEXT,
    "taskId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "actualTime" INTEGER,
    "estimatedTime" INTEGER NOT NULL,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,

    CONSTRAINT "ProductionTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionMetrics" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "ordersStarted" INTEGER NOT NULL DEFAULT 0,
    "ordersCompleted" INTEGER NOT NULL DEFAULT 0,
    "avgCycleTime" DOUBLE PRECISION,
    "avgTaskTime" JSONB NOT NULL,
    "bottlenecks" JSONB NOT NULL,
    "qualityScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionDocument" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "buildNumber" TEXT,
    "type" "ProductionDocType" NOT NULL,
    "title" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "content" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionWorkstationSync" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "syncData" JSONB NOT NULL,
    "synced" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionWorkstationSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductionChecklist_orderId_buildNumber_key" ON "ProductionChecklist"("orderId", "buildNumber");

-- CreateIndex
CREATE INDEX "ProductionChecklist_status_orderId_idx" ON "ProductionChecklist"("status", "orderId");

-- CreateIndex
CREATE INDEX "ProductionTask_orderId_category_idx" ON "ProductionTask"("orderId", "category");

-- CreateIndex
CREATE INDEX "ProductionTask_completed_orderId_idx" ON "ProductionTask"("completed", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionMetrics_date_key" ON "ProductionMetrics"("date");

-- CreateIndex
CREATE INDEX "ProductionMetrics_date_idx" ON "ProductionMetrics"("date");

-- CreateIndex
CREATE INDEX "ProductionDocument_orderId_type_idx" ON "ProductionDocument"("orderId", "type");

-- CreateIndex
CREATE INDEX "ProductionWorkstationSync_synced_userId_idx" ON "ProductionWorkstationSync"("synced", "userId");

-- AddForeignKey
ALTER TABLE "ProductionChecklist" ADD CONSTRAINT "ProductionChecklist_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionChecklist" ADD CONSTRAINT "ProductionChecklist_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionTask" ADD CONSTRAINT "ProductionTask_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionTask" ADD CONSTRAINT "ProductionTask_completedBy_fkey" FOREIGN KEY ("completedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionDocument" ADD CONSTRAINT "ProductionDocument_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionDocument" ADD CONSTRAINT "ProductionDocument_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionWorkstationSync" ADD CONSTRAINT "ProductionWorkstationSync_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionWorkstationSync" ADD CONSTRAINT "ProductionWorkstationSync_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;