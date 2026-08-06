-- เพิ่มเลขอ้างอิงธุรกรรมจากสลิป (SlipOK) — unique กันเอาสลิปเดิมมาจ่ายซ้ำ
ALTER TABLE "Payment" ADD COLUMN "slipTransRef" TEXT;
CREATE UNIQUE INDEX "Payment_slipTransRef_key" ON "Payment"("slipTransRef");
