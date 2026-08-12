-- อีเมล/เบอร์/googleId เดิม unique เดี่ยวๆ ทำให้คนที่มีบัญชีผู้เช่าอยู่แล้วสมัครเป็นเจ้าของหอไม่ได้
-- เปลี่ยนเป็น unique คู่กับ role: 1 อีเมลมีได้ 1 บัญชีต่อ 1 บทบาท (ผู้เช่า/เจ้าของหอ/แอดมิน แยกขาดกัน)
DROP INDEX IF EXISTS "User_email_key";
DROP INDEX IF EXISTS "User_phone_key";
DROP INDEX IF EXISTS "User_googleId_key";

CREATE UNIQUE INDEX "User_email_role_key" ON "User"("email", "role");
CREATE UNIQUE INDEX "User_phone_role_key" ON "User"("phone", "role");
CREATE UNIQUE INDEX "User_googleId_role_key" ON "User"("googleId", "role");
