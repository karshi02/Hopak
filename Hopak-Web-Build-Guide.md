# Hopak — คู่มือสร้างเว็บแอปพลิเคชัน (Web Build Guide)

> **โฟกัส: ทำ "เว็บ" ก่อน** — แอพมือถือทำทีหลัง แต่ทั้งสองต้องยิงเข้า **Backend API ตัวเดียวกัน**
> ข้อมูลผู้ใช้ / หอพัก / การจอง / การชำระเงิน = แหล่งความจริงเดียว (Single Source of Truth)
> เอกสารนี้ระบุทุกอย่างตั้งแต่ขั้นตอนงาน → UI → การแต่งสี ให้ตรงกับที่ออกแบบไว้มากที่สุด

---

## 0. หลักการสำคัญ (อ่านก่อน)

- **API-first** — ออกแบบ API + Database ให้จบก่อน แล้วเว็บค่อยเรียกใช้ พอทำแอพก็เรียก API ตัวเดิม
- เว็บ + แอพ = แค่ "หน้าจอ" คนละตัว แต่คุยกับ `api.hopak.co.th` ตัวเดียว
- Login บัญชีเดียว (SSO + JWT) ใช้ได้ทั้งผู้เช่าและเจ้าของหอ
- จองในเว็บ → เปิดในแอพเห็นสถานะเดียวกันทันที (เพราะ DB เดียว)

---

## 1. ความคืบหน้า (Progress Checklist)

### ✅ เสร็จแล้ว
- [x] สรุปโปรเจกต์ + business rules (`Hopak-Project-Brief.md`)
- [x] ออกแบบ UI ครบ 3 ฝั่ง (ผู้เช่า / เจ้าของหอ / แอดมิน) — mobile + web console
- [x] ระบบดีไซน์ (สี, ฟอนต์ IBM Plex Thai, มุมโค้ง, เงา) นิ่งแล้ว
- [x] Flow การจอง 5 ขั้น + timeline สถานะ
- [x] หน้าโปรไฟล์/บัญชี (แก้โปรไฟล์, เปลี่ยนรหัสจริง, ขอเป็นเจ้าของหอ)
- [x] Sitemap + สถาปัตยกรรม API-first + Tech Stack (ไฟล์ diagram)
- [x] Splash/Loader อนิเมชัน (`Hopak Loader.gif`, `Hopak Seller Loader.gif`)
- [x] Repo จริงเริ่มแล้ว (`karshi02/Hopak`) — NestJS + Prisma (API), Next.js (web)
- [x] เชื่อม mockup ↔ โครง component จริงใน `apps/web` ครบทุกหน้า (ผู้เช่า/Partner/Admin ตาม Claude Design docs)
- [x] Backend API Phase 1 ครบ — auth, dorms, rooms, bookings, payments (manual confirm), notifications, admin console 8 หน้า
- [x] หน้า Favorites (บันทึกหอ) + Reviews (รีวิว) — รีวิวได้เฉพาะคนที่เคยจอง+จ่ายเงินจริงเท่านั้น กันรีวิวปลอม
- [x] ระบบอนุมัติเป็นเจ้าของหอ (Owner Request Queue) — ต้องผ่านแอดมินอนุมัติก่อน ไม่ใช่กดปุ่มเดียวได้ role ฟรี
- [x] แยก Admin Portal ปลอดภัย — URL + endpoint login เฉพาะ แยกจากผู้ใช้ทั่วไปทั้งหมด
- [x] ระบบระงับบัญชี (suspend) + ส่งใบตักเตือน (แจ้งเตือนในระบบ + อีเมลจริงผ่าน Resend SMTP)
- [x] ระบบแจ้งเตือน realtime (WebSocket) — ต่อ JWT auth เข้า gateway จริง, จองใหม่ดันแบบ live หาเจ้าของหอ, สถานะจองอัปเดต live หาผู้เช่า (ยืนยัน/ปฏิเสธ/ยกเลิก/ชำระเงินเสร็จจาก cron เที่ยงคืน) ทดสอบ e2e ด้วย socket.io-client จริงผ่านแล้ว

### 🔨 กำลังทำ
- [ ] ปรับปรุง UX/UI ย่อยตาม feedback ต่อเนื่อง (มีบัค + งานเล็กๆ เข้ามาเรื่อยๆ ระหว่างทดสอบจริง)

### ⬜ ยังไม่เริ่ม
- [ ] เชื่อม Payment Gateway จริง (PromptPay / Omise / 2C2P) — ตอนนี้เป็น manual self-report ("ฉันชำระเงินแล้ว") เท่านั้น
- [ ] แอพมือถือ (Expo) — โฟลเดอร์ `apps/mobile` ยังว่างเปล่า ยังไม่เริ่มเลย
- [ ] Deploy: เว็บ/API/DB ขึ้น host จริง — กำลังตัดสินใจระหว่าง Railway กับ HostAtom Cloud VPS

---

## 2. ระบบดีไซน์ (Design System) — ใช้กับเว็บและแอพเหมือนกัน

### 2.1 ฟอนต์
- หลัก: **IBM Plex Sans Thai**, สำรอง `IBM Plex Sans`, sans-serif
- ตัวเลข/โค้ด: `IBM Plex Mono`
- น้ำหนัก: ปกติ 400–500, หัวข้อ 700
- Letter-spacing หัวข้อใหญ่: `-0.5px`

### 2.2 สีตามฝั่งผู้ใช้ (Theme Colors)

| ฝั่ง | สีหลัก (Primary) | Hover | ใช้กับ |
|------|------------------|-------|--------|
| **Hopak** (ผู้เช่า) | `#2F6FE0` (น้ำเงิน) | `#1E4FB0` | ปุ่ม, ลิงก์, chip เลือกอยู่, ราคา |
| **Hopak Seller** (เจ้าของหอ) | เขียว `#0E9F8E` | `#0F3D38` | ปุ่ม/แถบด้านข้าง console |
| **Hopak Admin** | ม่วง `#6D5AE0` (sidebar `#111827`) | — | ปุ่ม/แถบด้านข้าง console |

### 2.3 สีกลาง (Neutrals)
| บทบาท | HEX |
|-------|-----|
| ตัวอักษรหลัก (เข้มสุด) | `#111` / `#181B22` |
| ตัวอักษรรอง | `#5B616C` / `#7A808B` |
| ตัวอักษรจาง / hint | `#8A909B` / `#9AA0AB` |
| พื้นหน้า (canvas) | `#EDEFF3` / `#F2F2F7` |
| พื้นการ์ด | `#FFFFFF` |
| พื้นชิป/แท็ก | `#F1F3F6` |
| ช่องค้นหา (input bg) | `#E7E8EC` |
| เส้นขอบ (border) | `#E4E7EC` / `#D8DCE2` |

### 2.4 สีสถานะ (Semantic)
| ความหมาย | HEX | ใช้กับ |
|----------|-----|--------|
| เตือน/แจ้งเตือน (จุดแดง) | `#EB4D3D` | badge กระดิ่ง |
| ดาว/เรตติ้ง/โฆษณา | `#B4791A` (พื้น `#FEF6E7`) | ★ คะแนน, ป้าย "โฆษณา" |
| ป้ายมืด (บนรูป) | `#111827` | badge บนรูปหอ |

### 2.5 มุมโค้ง (Border Radius)
- ชิป/pill: `999px`
- ปุ่ม/input: `12px`–`14px`
- การ์ด: `16px`–`18px`
- โลโก้กล่อง: `11px`
- แท็กเล็ก: `6px`–`7px`

### 2.6 เงา (Shadow)
- การ์ด: `0 1px 3px rgba(0,0,0,0.05)` (นุ่ม บางเบา)

### 2.7 องค์ประกอบซ้ำ (Components)
- **ปุ่มหลัก**: พื้น `#2F6FE0`, ตัวอักษรขาว, radius 12px, ตัวหนา
- **ชิปเลือกได้**: ปกติพื้นขาว + border `#E4E7EC`; เลือกอยู่พื้น `#2F6FE0` ขาว
- **การ์ดหอพัก**: รูป (16px มุมบน) + ป้ายมุมซ้าย + ปุ่มหัวใจมุมขวา + ชื่อ + ★คะแนน + ทำเล + แท็กสิ่งอำนวยฯ + ราคา/เดือน
- **placeholder รูป**: ลายทแยง `#E9ECF1`/`#EEF1F5` มีป้ายกลางบอกว่าใส่อะไร

---

## 3. โครงเว็บ (Next.js Structure)

```
apps/web/
├─ (public)          # ไม่ต้องล็อกอิน
│  ├─ /              # หน้าแรก: ค้นหา + สปอนเซอร์ + แนะนำ
│  ├─ /search        # ผลค้นหา + filter (จังหวัด/ราคา/ประเภทห้อง/สิ่งอำนวยฯ)
│  ├─ /dorms/[id]    # รายละเอียดหอ: แกลเลอรี, ราคา, สิ่งอำนวยฯ, แผนที่, รีวิว
│  └─ /login /register /portal-9f3k/login (แอดมิน)
├─ (tenant)          # ผู้เช่า (role: tenant)
│  ├─ /bookings/[id] # สถานะการจอง + timeline + ปุ่มชำระเงิน
│  ├─ /saved         # หอที่บันทึก (favorites)
│  ├─ /profile       # โปรไฟล์ / เปลี่ยนรหัส / ขอเป็นเจ้าของหอ
│  └─ /notifications
├─ (partner)         # เจ้าของหอ Console (role: owner, ธีมเขียว)
│  ├─ /partner/dashboard
│  ├─ /partner/rooms /partner/dorms/new /dorms/[id]/edit
│  ├─ /partner/requests
│  └─ /partner/slips /partner/settings
└─ (admin)           # แอดมิน Console (role: admin, ธีมม่วง+ดำ)
   ├─ /admin/dashboard
   ├─ /admin/approvals /admin/owner-requests
   ├─ /admin/bookings /admin/users /admin/finance /admin/campaigns /admin/admins
```

---

## 4. หน้าจอเว็บที่ต้องทำ (ตามลำดับ)

**Public / ผู้เช่า**
1. หน้าแรก — ค้นหา, ชิปจังหวัด, การ์ดแนะนำ ✅
2. ผลค้นหา — grid การ์ด + filter (จังหวัด, ราคา, แอร์/พัดลม, สิ่งอำนวยฯ) ✅
3. รายละเอียดหอ — แกลเลอรีรูป, ราคา/เดือน + ค่าน้ำ-ไฟ, สิ่งอำนวยฯ, แผนที่ GPS, ปุ่ม "ส่งคำขอจอง" ✅
4. Flow จอง: ส่งคำขอ → รอเจ้าของยืนยัน → ยืนยันแล้ว → ชำระเงิน (manual confirm) → ใบจอง ✅ (PDF ยังไม่เชื่อมระบบจริง)
   - ยกเลิกได้ **ภายใน 1 วัน** เท่านั้น หลังจากนั้นปุ่มล็อก ✅
5. Favorites + Reviews ✅ (เสร็จแล้ว)
6. บัญชี/โปรไฟล์ ✅

**Seller/Partner Console** ✅ ครบทุกหน้า

**Admin Console** ✅ ครบทุกหน้า (รวม owner-requests approval)

---

## 5. Backend API (เว็บและแอพเรียกร่วมกัน)

**Stack:** NestJS + Prisma + PostgreSQL + Redis · Auth JWT+SSO · Realtime WebSocket (ต่อใช้จริงแล้ว)

### Data Model (มีจริงในระบบ)
- **User** — role `tenant|owner|admin`, ชื่อ, เบอร์, อีเมล, รูป, `suspended`
- **Dorm** — ชื่อ, คำอธิบาย, ownerId, จังหวัด, lat/lng, ค่าน้ำ/ไฟ, สิ่งอำนวยฯ, สถานะอนุมัติ
- **Room** — dormId, ประเภท (แอร์/พัดลม), ราคา/เดือน, สถานะ (ว่าง/ไม่ว่าง)
- **Booking** — tenantId, roomId, วันเข้าอยู่, ยอด, status `pending|confirmed|paid|cancelled|completed`
- **Payment** — bookingId, ยอด, ค่าคอม 10%, ยอดโอนหอ, สถานะ, วิธีชำระ
- **Review** — dormId, tenantId, คะแนน, ความเห็น (unique ต่อคนต่อหอ, เช็คจากประวัติจองจริง)
- **Favorite** — userId, dormId
- **OwnerRequest** — userId, status `pending|approved|rejected`
- **Notification** — userId, type (รวม `warning`), title, body, readAt

### Endpoint หลัก (มีจริงในระบบ)
```
POST /auth/login  /auth/register  /auth/google  /auth/admin-login
GET  /dorms        ?q&province&university   (ค้นหา)
GET  /dorms/:id
POST /bookings                    (ส่งคำขอจอง)
PATCH /bookings/:id/confirm|reject|cancel
POST /bookings/:id/payment
GET  /favorites  POST /favorites/:dormId/toggle
GET  /dorms/:id/reviews  POST /dorms/:id/reviews
POST /users/me/become-owner  GET /users/me/owner-request
PATCH /users/me/password
GET  /admin/owner-requests  PATCH /admin/owner-requests/:id/approve|reject
GET  /admin/users  PATCH /admin/users/:id/suspend  POST /admin/users/:id/warning
GET  /admin/approvals  PATCH /admin/approvals/:id/approve|reject
```

### กฎธุรกิจ (บังคับใน API — ทำครบแล้ว)
1. จองต้องเรียงลำดับ ห้ามข้ามขั้น ✅
2. ยกเลิกฟรีภายใน 1 วัน หลังจากนั้นล็อก ✅
3. หัก **10%** จากทุกยอดที่ชำระ ✅
4. เบอร์ผู้จองซ่อนบางส่วน (`089-123-**-*`) ✅
5. เจ้าของแก้หอ/ห้องเองได้ทันที (หอใหม่รออนุมัติครั้งแรก) ✅
6. เงินเข้าบัญชีกลาง ตัดยอดภายในเที่ยงคืน (cron จริง) ✅
7. *(เพิ่มใหม่)* ขอเป็นเจ้าของหอต้องผ่านแอดมินอนุมัติก่อน ไม่ใช่เปลี่ยน role ทันที ✅

---

## 6. การเชื่อมข้อมูล เว็บ ↔ แอพ

```
        [ เว็บ Next.js ]         [ แอพ Expo — ยังไม่เริ่ม ]
               │                      │
               └──────── HTTPS ───────┘
                         │
                   api.hopak.co.th   ← ตัวเดียว (ยังไม่ deploy)
                         │
                   PostgreSQL (DB เดียว)
```
- ล็อกอินเว็บแล้วได้ JWT → แอพใช้ token/บัญชีเดียวกัน (พร้อมรองรับ เมื่อเริ่มแอพ)
- สูตรหัก 10% + validation อยู่ใน `packages/shared` ใช้ร่วมทุกฝั่ง

---

## 7. ลำดับลงมือ (Roadmap)

- **Phase 1** — Monorepo + Backend API (NestJS + Prisma + PostgreSQL) + Admin อนุมัติ ✅ **เสร็จแล้ว**
- **Phase 2** — เว็บ Next.js เรียก API (ผู้เช่า → Seller → Admin) ✅ **เสร็จแล้ว** (รวม favorites/reviews/owner-approval/admin security เกินแผนเดิม)
- **Phase 3** — แอพ Expo เรียก API เดิม + Push + offline ⬜ **ยังไม่เริ่ม**
- **Next** — เชื่อม payment gateway จริง, Deploy ขึ้น host จริง

---

*ภาษา: ไทย · สกุลเงิน: บาท (฿) · ตลาด: มหาสารคาม, ขอนแก่น, เชียงใหม่ · Repo: karshi02/Hopak*
