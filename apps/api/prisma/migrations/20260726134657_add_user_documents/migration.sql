-- AlterTable
ALTER TABLE "User" ADD COLUMN     "documents" TEXT[] DEFAULT ARRAY[]::TEXT[];
