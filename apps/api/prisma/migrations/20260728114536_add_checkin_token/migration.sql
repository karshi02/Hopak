-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "checkInToken" TEXT,
ADD COLUMN     "checkInTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "checkedInAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_checkInToken_key" ON "Booking"("checkInToken");

