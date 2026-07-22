# Hopak — สรุปแชทเซสชันนี้

> สรุปงานที่คุยและทำกันในเซสชันนี้ทั้งหมด เรียงตามลำดับเหตุการณ์

---

## 1. ฟีเจอร์ใหม่ที่สร้าง

### รีวิว + บันทึกหอ (Favorites & Reviews)
- เพิ่ม model `Review`, `Favorite` ในฐานข้อมูล
- รีวิวได้เฉพาะคนที่**เคยจอง+จ่ายเงินหอนั้นจริง**เท่านั้น (กันรีวิวปลอม)
- หัวใจกดบันทึกหอที่ถูกใจ มีหน้า `/saved`
- ค้นหาหอเพิ่ม filter จริง (ราคา, ประเภทห้อง, สิ่งอำนวยความสะดวก), ช่องค้นหารวมใน Navbar (`q` param)
- ดาวรีวิวโชว์บนการ์ดค้นหา + หน้ารายละเอียดหอ

### ระบบอนุมัติเป็นเจ้าของหอ (Owner Request Queue)
- เดิม: กดปุ่มเดียวเป็นเจ้าของหอทันที ไม่มีการเช็คอะไรเลย
- แก้เป็น: tenant กด "ขอเป็นเจ้าของหอ" → สร้างคำขอสถานะ `PENDING` (role ยังไม่เปลี่ยน) → แอดมินอนุมัติ/ปฏิเสธที่ `/admin/owner-requests` → อนุมัติแล้วถึงเปลี่ยน role จริง

### แยก Admin Portal ปลอดภัย
- เดิม: ทุก role login หน้าเดียวกัน (`/login`) เสี่ยงถูกสแกน/บรูทฟอร์ซหาแอดมิน
- แก้เป็น: `/auth/login` ปกติ**ปฏิเสธ role admin เลย** (แม้ password ถูก), สร้าง endpoint ลับ `/auth/admin-login` + หน้าเว็บลับ `/portal-9f3k/login` (ไม่มีลิงก์จากที่ไหนในเว็บเลย)

### ระบบระงับบัญชี + ใบตักเตือน
- เพิ่ม field `User.suspended`, บล็อก login ถ้าโดนระงับ, ห้ามระงับบัญชีแอดมิน
- หน้า `/admin/users` เพิ่มคอลัมน์ครบตาม design จริง (จอง, เข้าร่วม, สถานะ, จัดการ) + ช่องค้นหา
- ปุ่ม "แจ้งเตือน" ส่งใบตักเตือนเข้าระบบ (Notification จริง) + **อีเมลจริง** ผ่าน Resend SMTP (ต่อ nodemailer, มี `.env` SMTP_* ครบ)

### Realtime WebSocket (เพิ่งทำเสร็จ)
- เดิม: มีไฟล์ `realtime.gateway.ts` เปล่าๆ ไม่เคยต่อใช้งานจริง
- แก้เป็น: ต่อ JWT auth เข้า gateway (verify token ตอน connect, join ห้องตาม userId)
- จองใหม่ → เจ้าของหอเห็นแบบ live (`booking:new`)
- ยืนยัน/ปฏิเสธ/ยกเลิก/ชำระเงินเสร็จ (จาก cron เที่ยงคืน) → ผู้เช่าเห็นสถานะ live (`booking:updated`)
- ทดสอบ e2e จริงด้วย socket.io-client script (จำลอง owner+tenant connect พร้อมกัน) ผ่านทั้งสองทิศทาง

---

## 2. บัคที่เจอและแก้ในเซสชันนี้ (log เต็มใน `Bug/bugs.txt`)

| # | บัค | สถานะ |
|---|-----|-------|
| 14 | ไม่มี Navbar ในหน้า tenant/public | แก้แล้ว |
| 15 | `/search` พัง 500 หลังรัน `next build` ทับตอน dev server รันอยู่ | แก้แล้ว |
| 16 | Dev server jest-worker crash ชั่วคราว | แก้แล้ว (restart) |
| 17 | Partner "คำขอจอง" ไม่มีปุ่มปฏิเสธจริง (ไม่มี endpoint) | แก้แล้ว |
| 18 | Admin finance ไม่แยกยอด "โอนแล้ว"/"ค้างโอน" | แก้แล้ว |
| 19 | ลง npm package ผิด (`railway` แทน `@railway/cli`) + PATH เครื่องไม่มี npm global bin | แก้แล้ว |
| 20 | Jest worker crash + useContext error ตามมา | แก้แล้ว (restart) |
| 21 | `useDormSearch` ส่ง `province=undefined` เป็น string จริง ทำ filter "ทั้งหมด" พัง | แก้แล้ว |
| 22 | ไฟล์ login ถูกเครื่องมือนอกเขียนทับด้วย mock ปลอม พังทั้งเว็บ | แก้แล้ว |
| 23 | Admin/Owner console เข้าไม่ได้เลยจริงๆ (middleware เช็ค cookie ที่ไม่มีใครเซ็ต) | แก้แล้ว |
| 24 | หลายหน้า tenant throw "Unhandled Runtime Error" ถ้าไม่ได้ล็อกอิน | แก้แล้ว |
| 25 | สมัครซ้ำเบอร์/อีเมล ได้ 500 แทนข้อความบอกซ้ำ | แก้แล้ว |
| 26 | `PATCH /notifications/:id/read` ไม่เช็ค ownership | **ยังไม่แก้** (severity ต่ำ) |
| 27 | `MailService.send()` ไม่ catch error ทำ endpoint 500 | แก้แล้ว |
| 28 | SMTP (Resend) ยังไม่ verify domain ส่งอีเมลไปหา user ทั่วไปไม่ได้ | รอ verify domain (ไม่ใช่บัคโค้ด) |

---

## 3. เรื่อง Deploy / Hosting

- เช็คแล้ว: **HostAtom Web Hosting Max DA** (ที่ซื้อไปแล้ว, โดเมน `hopak.co.th`) เป็น shared hosting (DirectAdmin) — **deploy Hopak ไม่ได้เลย** (ไม่มี SSH, ไม่มี PostgreSQL มีแต่ MySQL, ไม่มี Docker/Node.js)
- HostAtom มี **Cloud VPS SSD** แยกขาย (SSD2 590บาท/ด. หรือ SSD3 1,190บาท/ด.) มี root/SSH จริง ใช้ได้
- แผนที่ตกลงกัน: ใช้ Max DA เดิมสำหรับ domain/DNS/email ต่อไป + ซื้อ Cloud VPS (หรือ Railway) แยกสำหรับรันแอปจริง เชื่อมกันด้วย DNS subdomain (`app.hopak.co.th`, `api.hopak.co.th`)
- Railway ก็เตรียมไว้แล้ว (`railway 5.27.0` ติดตั้งพร้อมใช้) — ยังไม่ได้ตัดสินใจเลือกทางไหนสุดท้าย, ยังไม่ได้ deploy จริง

---

## 4. สถานะปัจจุบัน (เทียบ `Hopak-Web-Build-Guide.md`)

**เสร็จแล้ว**: Backend API Phase 1, เว็บ Phase 2 ครบ 3 ฝั่ง (ผู้เช่า/เจ้าของหอ/แอดมิน), รีวิว+บันทึกหอ, owner-approval, admin portal แยก, ระงับบัญชี+ใบตักเตือน, realtime WebSocket

**ยังไม่เริ่ม**: Payment gateway จริง (PromptPay/Omise — ตอนนี้ manual confirm), แอพมือถือ (Expo), Deploy ขึ้น host จริง
