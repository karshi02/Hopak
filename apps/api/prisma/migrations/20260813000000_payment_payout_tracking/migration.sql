-- ผูกการโอนออก (Xendit Payouts) กลับมาหา payment ที่โอนในรอบนั้น
-- ใช้ตอน webhook แจ้งว่าโอนล้มเหลว/ตีกลับ เพื่อดึงสถานะกลับเป็นรอโอนใหม่
ALTER TABLE "Payment" ADD COLUMN "payoutId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "payoutRef" TEXT;
ALTER TABLE "Payment" ADD COLUMN "payoutStatus" TEXT;
ALTER TABLE "Payment" ADD COLUMN "payoutFailedReason" TEXT;

CREATE INDEX "Payment_payoutId_idx" ON "Payment"("payoutId");
