# Hopak — Session Handoff (สำหรับ AI/แชทถัดไป)

สรุปสถานะโปรเจกต์ Hopak (แพลตฟอร์มจองหอพักใกล้มหาวิทยาลัย) หลังจบเซสชันยาวที่ผ่านมา ให้ AI ตัวใหม่อ่านแล้วรับงานต่อได้ทันที

## โครงสร้างโปรเจกต์

Monorepo: pnpm workspaces + Turborepo
- `apps/web` — Next.js App Router (frontend, 3 consoles)
- `apps/api` — NestJS + Prisma + PostgreSQL (backend)
- `packages/shared` — types/constants ที่ใช้ร่วมกัน **ต้อง `npm run build` ทุกครั้งหลังแก้ type** (apps/web import จาก `dist/` ที่ compile แล้ว ไม่ใช่ source ตรงๆ)

Dev servers: web = `http://localhost:3001`, api = `http://localhost:4000`, DB = postgres `localhost:5433`

## 3 Console / 3 บทบาท

| Role | Login URL | Sidebar theme |
|---|---|---|
| ผู้เช่า (tenant) | `/login`, `/register` | หน้าเว็บสาธารณะปกติ |
| เจ้าของหอ (owner) | `/partner-login` | Seller Console — sidebar navy `#0E1220` + โลโก้เขียว |
| แอดมิน (admin) | `/portal-9f3k/login` (URL ซ่อนไว้ตั้งใจ) | Admin Console — sidebar navy `#0E1220` + accent น้ำเงิน |

หน้าแรก `/` และ `/search` เป็นสาธารณะ ไม่ต้องล็อกอิน แต่กด "จอง" จะ redirect ไป `/login` บังคับสมัคร/ล็อกอินก่อนเสมอ (มีอยู่แล้ว ไม่ต้องแก้)

## บัญชีทดสอบที่ตั้งไว้ (ใช้ได้เลย)

- **Admin**: `admin@hopak.com` / `Hopak2026!`
- **Owner**: `owner@hopak.com` / `Hopak2026!` (เจ้าของ "หอทดสอบ Hopak", dormId `cmrm3acxm0004v6p9fyys14ol`)
- **Tenant**: `demo-tenant@hopak.com` / `hopak1234`

## งานที่ทำเสร็จในเซสชันนี้ (เรียงตามลำดับ)

1. **แก้ S3 upload พัง** — `UploadsService` fallback เขียนไฟล์ลงดิสก์เครื่อง (`apps/api/uploads/` และ `apps/api/private-uploads/`) เมื่อ S3 env ว่าง แทนที่จะ crash
2. **ระบบเก็บเอกสารส่วนตัวแบบปลอดภัย** — เอกสารอ่อนไหว (บัตร ปชช./โฉนด/สลิปโอนเงิน) เก็บผ่าน signed URL ชั่วคราว (`GET /files/:token`, HMAC เซ็น, หมดอายุ 15 นาที) ไม่มี URL ถาวรสาธารณะ ต่างจากรูปหอพัก/ห้องที่ยังเป็น public URL ปกติ
3. **หน้าแรก: ค้นหาสถานที่ + ระยะทาง** — ผูก Google Places Autocomplete เข้าช่องค้นหาเดิม เลือกสถานที่แล้วไป `/search` พร้อม lat/lng คำนวณระยะทางจริง (Haversine) แสดงต่อการ์ดหอพัก
4. **Admin UI reskin ทั้งหมด** — sidebar navy ใหม่, KPI cards, กราฟรายได้ (SVG วาดเอง ไม่ใช้ chart lib), reskin ครบ 9 หน้า (dashboard, bookings, approvals, users, finance, campaigns, admins, owner-requests, website)
5. **Admin ควบคุมการจองได้** — `PATCH /bookings/:id/admin-cancel` และ `/admin-restore` (ยกเลิก/กู้คืนได้ ไม่ผูก 24ชม.window เหมือนฝั่งผู้เช่า)
6. **เปลี่ยนค่าคอมมิชชัน 10% → 20%** — แบ่งหอการค้ามหาสารคาม 10% + แพลตฟอร์ม 10% เจ้าของหอเหลือ 80% (เดิม 90%) ค่าที่คำนวณ ณ ตอนจ่ายเก็บลง DB จริง ไม่ derive ย้อนหลัง (ประวัติเก่าก่อนเปลี่ยนยังถูกต้อง)
7. **ระบบโอนเงินให้เจ้าของหอแบบเต็มรูปแบบ** — เจ้าของหอตั้งค่าบัญชีธนาคารจริงที่ `/partner/settings` (เดิมเป็นแค่ state ปลอมไม่เชื่อม DB), แอดมินเห็นรายชื่อเจ้าของหอที่รอโอนใน `/admin/finance`, กดโอน → แนบสลิปจริง + แก้ยอดโอนเองได้ (เผื่อปัดเศษ) → ระบบส่งอีเมล+แจ้งเตือนในแอปให้เจ้าของหอทันที
8. **แจ้งเตือนเรียลไทม์ (WebSocket)** — `NotificationsService.create()` broadcast event `notification:new` ผ่าน socket.io ให้ทุก notification ใหม่ขึ้นทันทีไม่ต้องรีเฟรชหน้า (ใช้ที่ `/partner/notifications` และ `/notifications` ฝั่งผู้เช่า)
9. **Partner/Seller Console reskin เต็มรูปแบบ** — ตาม mock "Hopak Seller Dashboard" sidebar navy, dashboard มี KPI จริง (รายได้/อัตราเข้าพัก/รอยืนยัน/คะแนนรีวิวจริง), หน้าห้องพักเป็น card grid
10. **ฟีเจอร์ใหม่ที่ไม่เคยมี: เพิ่มห้องพักได้จริง** — เดิม Room model มีแค่ type+ราคา ไม่มีชื่อ/รูป/สิ่งอำนวยความสะดวก/ค่าน้ำไฟ เพิ่ม field ครบ + หน้า `/partner/rooms/new` (ฟอร์มเต็ม + live preview เรียลไทม์) + สร้างได้ทีละหลายห้อง (quantity)
11. **ระบบอนุมัติหอพัก/ห้องพักโดยแอดมิน** — `Room.approved` (default ตาม `Dorm.autoApproveRooms` ที่แอดมินตั้งได้ต่อหอ), ห้องที่ยังไม่อนุมัติไม่โชว์ในหน้าค้นหาสาธารณะ, แอดมินมีหน้า "ห้องพักรอตรวจสอบ" + "หอพักทั้งหมด" (แก้ไขข้อมูลหอ + toggle auto-approve ได้)
12. **แก้บั๊ก CSS sidebar** — `min-h-screen` → `h-screen overflow-hidden` (เดิมปุ่ม logout/สลับภาษาหลุดจอเวลาหน้ายาวเกิน 1 จอ)
13. **เคลียร์ zombie node process** — ค้างจากการ restart ซ้ำหลายรอบ (migration ต้อง kill dev server ก่อนทุกครั้งบน Windows เพราะ Prisma engine ไฟล์ล็อก)

## Architecture facts สำคัญที่ต้องรู้ก่อนแก้โค้ดต่อ

- **Role casing bug pattern**: JWT เก็บ role เป็นตัวเล็ก (`tenant`/`owner`/`admin`) แต่ Prisma enum เป็นตัวใหญ่ — เจอบั๊กนี้ซ้ำหลายรอบมาก ก่อนแก้อะไรเกี่ยวกับ role/status ให้เช็ค case ให้ดี มี `normalizeStatus()` helper (`apps/web/src/lib/normalize.ts`) ใช้เทียบ booking/room status เสมอ
- **Prisma migration บน Windows**: ต้อง kill dev server (`netstat -ano | findstr :4000` หา PID, `Stop-Process`) ก่อนรัน `npx prisma migrate dev` ทุกครั้ง ไม่งั้น query engine .dll ไฟล์ล็อก EPERM
- **packages/shared**: แก้ type ที่ `src/` แล้วต้อง `cd packages/shared && npm run build` ก่อน apps/web จะเห็นการเปลี่ยนแปลง
- **Uploads สองแบบ**: `UploadsService.upload(key, buffer, mimetype, visibility)` — `'public'` (รูปหอพัก/ห้อง, URL ถาวร) vs `'private'` (เอกสาร/สลิป, ต้องผ่าน `getPrivateUrl()` สร้าง signed token ใหม่ทุกครั้ง หมดอายุ 15 นาที)
- **Realtime**: `apps/web/src/lib/ws.ts` มี `getSocket()` singleton, backend `RealtimeGateway.emitToUser(userId, event, payload)` join room `user:<id>` ตาม JWT
- **Mail**: `MailService.send()` คืน `false` เงียบๆ ถ้า SMTP ไม่ได้ตั้งค่า/ส่งพัง ไม่ throw — endpoint ที่เรียกต้องไม่พังตาม (ดู pattern ที่ finance/notifications ใช้)
- **apiClient error handling**: `apps/web/src/lib/api-client.ts` throw Error ถ้า response ไม่ ok — ทุกจุดที่เรียก `apiClient.get/post/patch/delete(...).then(...)` **ต้องมี `.catch()`** ไม่งั้น unhandled rejection ทำทั้งหน้า crash (เจอบั๊กนี้ซ้ำหลายรอบ, บันทึกไว้ log [24] และ [33] ใน bugs.txt) — เขียนหน้าใหม่ทุกครั้งต้องเช็คจุดนี้ทันที
- **Multipart upload**: `apiClient` บังคับ `Content-Type: application/json` เสมอ — ทุกจุดที่ต้องอัปโหลดไฟล์ (รูป/สลิป) ต้องใช้ raw `fetch()` + `FormData` แทน (ดู pattern ใน `partner/rooms/new`, `admin/finance` TransferModal)
- **RolesGuard**: `@Roles('admin')` เทียบ `user.role` ตรงๆ (ไม่ case-insensitive) — JWT sign() แปลง role เป็น lowercase ไว้แล้วตอน login เท่านั้น
- **Caveman mode**: user ใช้สไตล์สื่อสารสั้นกระชับ (ภาษาไทยแบบไม่มีคำฟุ่มเฟือย) — ควรตอบสนองรูปแบบเดียวกัน โค้ด/commit message ยังคงเขียนปกติ

## Bug log convention

`Bug/bugs.txt` — log บั๊กทุกตัวที่เจอ (ภาษาไทย, format: `[เลข] อาการ` แล้วตามด้วย ไฟล์/อาการ/สาเหตุ/แก้ไข/สถานะ) นี่คือ **คำสั่งค้างของ user memory** ต้อง log ทุกบั๊กที่เจอที่นี่เสมอ ไม่ใช่แค่บอกในแชท ปัจจุบันมีถึง entry [34]

ไฟล์อื่นใน `Bug/`: `Debug.txt` (QA sweep record), `resend-domain-verify-pending.txt` (เรื่องค้างด้านล่าง)

## เรื่องค้าง / ยังไม่เสร็จ

1. **Resend SMTP domain verification ค้างอยู่** — โดเมน `hoprak.com` เพิ่มใน Resend แล้ว (status pending) แต่ DNS record ยังไม่ถูกเพิ่มที่ Hostatom (ผู้ให้บริการโฮสต์) เลย รายละเอียด record ที่ต้องใส่ + ขั้นตอนอยู่ใน `Bug/resend-domain-verify-pending.txt` — ระหว่างนี้ระบบ fallback log OTP/อีเมลลง server console แทน (`[DEV] OTP สำหรับ ... คือ xxxxxx`) ใช้ทดสอบได้ปกติ
2. **ฟีเจอร์ที่ตั้งใจไม่สร้าง** (ไม่มี backend รองรับ ไม่อยากทำ UI หลอก): ระบบแชทเจ้าของหอ-ผู้เช่า, ปุ่มดันฟีด/ซื้อแคมเปญด้วยตัวเองของเจ้าของหอ (ตอนนี้แอดมินสร้างแคมเปญให้เท่านั้น), ออกใบกำกับภาษี/PDF จริง (ปุ่มยังเป็น disabled พร้อม tooltip บอกตรงๆ)
3. ยังไม่มีหน้า "การเงิน" ฝั่งเจ้าของหอเอง (ดูรายได้/ค่าคอมของหอตัวเองแบบละเอียด) — ตอนนี้เห็นแค่ผ่าน dashboard KPI

## วิธีทำงานที่ session นี้ยึดถือ (ควรทำต่อแบบเดิม)

- ทุกฟีเจอร์ backend ใหม่ **ทดสอบจริงผ่าน curl ก่อนส่งมอบเสมอ** (สร้าง test user/data ชั่วคราว → ยิง request จริง → ตรวจผลลัพธ์ → ลบ test data ทิ้ง) ไม่เดาว่าโค้ดถูก
- `npx tsc --noEmit` ทั้ง `apps/web` และ `apps/api` ทุกครั้งก่อนบอกว่าเสร็จ
- ไม่สร้าง UI ที่กดแล้วไม่ทำอะไรจริง (fake feature) — ถ้าไม่มี backend รองรับ ให้บอก user ตรงๆ ว่าทำไม่ได้/ยังไม่ทำ ดีกว่าใส่ปุ่มหลอก
- log บั๊กทุกตัวที่เจอ (ของตัวเองหรือของเดิม) ลง `Bug/bugs.txt` เสมอ ไม่ใช่แค่พูดในแชท
