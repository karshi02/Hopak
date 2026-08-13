-- เก็บ QR string ไว้คืนตัวเดิมตอนรีเฟรชหน้าชำระเงิน (เดิมสร้าง QR ใหม่ทุกครั้ง = ต่ออายุ hold ห้องได้ไม่จำกัด)
ALTER TABLE "Payment" ADD COLUMN "gatewayQrString" TEXT;
