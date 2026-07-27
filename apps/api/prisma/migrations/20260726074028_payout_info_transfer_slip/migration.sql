-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "transferSlipKey" TEXT,
ADD COLUMN     "transferredAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bankAccountNumber" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "promptpayId" TEXT;
