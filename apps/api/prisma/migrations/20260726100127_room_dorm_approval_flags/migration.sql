-- AlterTable
ALTER TABLE "Dorm" ADD COLUMN     "autoApproveRooms" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "approved" BOOLEAN NOT NULL DEFAULT true;
