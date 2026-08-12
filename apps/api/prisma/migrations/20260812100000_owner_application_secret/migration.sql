-- ใบสมัครเปิดหอเดิมใช้ id เป็น capability เดียว ใครรู้ id ก็แก้/อัปโหลด/กด finish ได้
-- เพิ่ม continuation secret (เก็บเฉพาะ sha256) ที่ต้องแนบมาทุก request ของใบสมัครนั้น
ALTER TABLE "OwnerApplication" ADD COLUMN "secretHash" TEXT;
ALTER TABLE "OwnerApplication" ADD COLUMN "verifiedSecretHash" TEXT;
