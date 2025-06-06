-- CreateEnum
CREATE TYPE "PartType" AS ENUM ('COMPONENT', 'MATERIAL');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AssemblyType" AS ENUM ('SIMPLE', 'COMPLEX', 'SERVICE_PART', 'KIT');

-- CreateTable
CREATE TABLE "Part" (
    "PartID" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "manufacturerPartNumber" TEXT,
    "type" "PartType" NOT NULL,
    "status" "Status" NOT NULL,
    "photoURL" TEXT,
    "technicalDrawingURL" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Part_pkey" PRIMARY KEY ("PartID")
);

-- CreateTable
CREATE TABLE "Assembly" (
    "AssemblyID" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AssemblyType" NOT NULL,
    "categoryCode" TEXT,
    "subcategoryCode" TEXT,
    "workInstructionId" TEXT,
    "qrData" TEXT,
    "kitComponentsJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assembly_pkey" PRIMARY KEY ("AssemblyID")
);

-- CreateTable
CREATE TABLE "AssemblyComponent" (
    "id" SERIAL NOT NULL,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "parentAssemblyId" TEXT NOT NULL,
    "childPartId" TEXT,
    "childAssemblyId" TEXT,

    CONSTRAINT "AssemblyComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("categoryId")
);

-- CreateTable
CREATE TABLE "Subcategory" (
    "subcategoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "Subcategory_pkey" PRIMARY KEY ("subcategoryId")
);

-- CreateTable
CREATE TABLE "_SubcategoryAssemblies" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SubcategoryAssemblies_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Part_PartID_key" ON "Part"("PartID");

-- CreateIndex
CREATE UNIQUE INDEX "Assembly_AssemblyID_key" ON "Assembly"("AssemblyID");

-- CreateIndex
CREATE UNIQUE INDEX "Category_categoryId_key" ON "Category"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Subcategory_subcategoryId_key" ON "Subcategory"("subcategoryId");

-- CreateIndex
CREATE INDEX "_SubcategoryAssemblies_B_index" ON "_SubcategoryAssemblies"("B");

-- AddForeignKey
ALTER TABLE "AssemblyComponent" ADD CONSTRAINT "AssemblyComponent_parentAssemblyId_fkey" FOREIGN KEY ("parentAssemblyId") REFERENCES "Assembly"("AssemblyID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssemblyComponent" ADD CONSTRAINT "AssemblyComponent_childPartId_fkey" FOREIGN KEY ("childPartId") REFERENCES "Part"("PartID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssemblyComponent" ADD CONSTRAINT "AssemblyComponent_childAssemblyId_fkey" FOREIGN KEY ("childAssemblyId") REFERENCES "Assembly"("AssemblyID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subcategory" ADD CONSTRAINT "Subcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("categoryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SubcategoryAssemblies" ADD CONSTRAINT "_SubcategoryAssemblies_A_fkey" FOREIGN KEY ("A") REFERENCES "Assembly"("AssemblyID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SubcategoryAssemblies" ADD CONSTRAINT "_SubcategoryAssemblies_B_fkey" FOREIGN KEY ("B") REFERENCES "Subcategory"("subcategoryId") ON DELETE CASCADE ON UPDATE CASCADE;
