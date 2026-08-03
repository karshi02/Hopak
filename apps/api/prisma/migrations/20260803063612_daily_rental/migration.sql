-- CreateEnum
CREATE TYPE "RentalType" AS ENUM ('MONTHLY', 'DAILY');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "checkOutDate" TIMESTAMP(3),
ADD COLUMN     "nights" INTEGER,
ADD COLUMN     "rentalType" "RentalType" NOT NULL DEFAULT 'MONTHLY';

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "allowDaily" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pricePerDay" DOUBLE PRECISION NOT NULL DEFAULT 0;
