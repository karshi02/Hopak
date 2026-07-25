-- AlterTable
ALTER TABLE "Dorm" ADD COLUMN     "address" TEXT,
ADD COLUMN     "documents" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "OwnerApplication" ADD COLUMN     "address" TEXT,
ADD COLUMN     "documents" TEXT[] DEFAULT ARRAY[]::TEXT[];
