-- AlterTable
ALTER TABLE "OwnerRequest" ADD COLUMN     "address" TEXT,
ADD COLUMN     "documents" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "dormName" TEXT,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "province" TEXT;
