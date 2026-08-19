-- อัตราค่าคอมที่แอดมินปรับได้จากหน้าเว็บ (สัดส่วน 0-1) NULL = ใช้ค่า default ในโค้ด
ALTER TABLE "SiteSettings" ADD COLUMN "commissionRate" DOUBLE PRECISION;
ALTER TABLE "SiteSettings" ADD COLUMN "dailyCommissionRate" DOUBLE PRECISION;
