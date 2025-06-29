-- Add Clerk integration fields to User table
ALTER TABLE "User" ADD COLUMN "clerkId" TEXT;
ALTER TABLE "User" ADD COLUMN "clerkEmail" TEXT;

-- Add unique constraint for clerkId
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");