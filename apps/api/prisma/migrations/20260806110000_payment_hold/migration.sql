-- จองชั่วคราวระหว่างชำระเงิน (hold) กันจ่ายห้องซ้อน + เส้นตายชำระเงิน
ALTER TABLE "Room" ADD COLUMN "heldUntil" TIMESTAMP(3);
ALTER TABLE "Room" ADD COLUMN "heldByBookingId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "paymentDeadline" TIMESTAMP(3);
