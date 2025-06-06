-- AlterTable
ALTER TABLE "User" ADD COLUMN     "assignedTaskIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
