# Hopak — โครงสร้างไฟล์ทั้งระบบ (Monorepo)

> อิงตาม Project Brief: **pnpm workspaces + Turborepo** · TypeScript ทั้งระบบ
> API-first → เว็บและแอพเป็นแค่ "หน้าจอ" ยิงเข้า `apps/api` ตัวเดียว

---

## 1. ภาพรวมระดับบนสุด

```
hopak/
├─ apps/
│  ├─ api/          # NestJS + Prisma + PostgreSQL — Backend กลาง (api.hopak.com)
│  ├─ web/          # Next.js — เว็บผู้เช่า + Partner Console + Admin Console
│  └─ mobile/       # Expo React Native — แอพผู้เช่า + Hopak Partner (iOS/Android)
│
├─ packages/
│  ├─ shared/       # types, constants, business logic (สูตรหัก 10%, กฎยกเลิก 1 วัน)
│  ├─ ui/           # (optional) React components ใช้ร่วม web
│  └─ config/       # eslint, tsconfig, prettier config กลาง
│
├─ docker/
│  ├─ docker-compose.yml        # PostgreSQL + Redis สำหรับ dev
│  └─ Dockerfile.api            # build API สำหรับ deploy (Railway/AWS)
│
├─ .github/
│  └─ workflows/
│     ├─ ci.yml                 # lint + test + build ทุก PR
│     └─ deploy-api.yml         # deploy API อัตโนมัติ
│
├─ turbo.json                   # Turborepo pipeline (build/dev/lint/test)
├─ pnpm-workspace.yaml          # ประกาศ workspaces: apps/* , packages/*
├─ package.json                 # root scripts: dev, build, db:migrate ฯลฯ
├─ .env.example                 # ตัวอย่าง env ทุกตัวที่ต้องใช้
└─ README.md
```

---

## 2. `apps/api` — NestJS Backend (หัวใจของระบบ)

```
apps/api/
├─ prisma/
│  ├─ schema.prisma             # ★ โมเดลทั้งหมด (ดูข้อ 6)
│  ├─ migrations/               # ประวัติ migration
│  └─ seed.ts                   # ข้อมูลตัวอย่าง (จังหวัด, admin คนแรก, หอทดสอบ)
│
├─ src/
│  ├─ main.ts                   # bootstrap + CORS + global pipes
│  ├─ app.module.ts             # รวมทุก module
│  │
│  ├─ common/                   # ใช้ร่วมทุก module
│  │  ├─ guards/
│  │  │  ├─ jwt-auth.guard.ts
│  │  │  └─ roles.guard.ts      # tenant | owner | admin (+ admin ย่อย)
│  │  ├─ decorators/
│  │  │  ├─ current-user.decorator.ts
│  │  │  └─ roles.decorator.ts
│  │  ├─ interceptors/          # logging, transform response
│  │  ├─ filters/               # exception filter กลาง
│  │  └─ utils/
│  │     └─ phone-mask.util.ts  # ★ ซ่อนเบอร์ 089-123-**-* จนกว่าจะจ่ายเงิน
│  │
│  ├─ modules/
│  │  ├─ auth/                  # สมัคร/ล็อกอิน (Google OAuth + อีเมล/เบอร์) + JWT + SSO
│  │  │  ├─ auth.module.ts
│  │  │  ├─ auth.controller.ts
│  │  │  ├─ auth.service.ts
│  │  │  ├─ strategies/         # jwt.strategy.ts, google.strategy.ts
│  │  │  └─ dto/
│  │  │
│  │  ├─ users/                 # โปรไฟล์, เปลี่ยน role เป็น owner ("เปิดหอพักกับ Hopak")
│  │  │
│  │  ├─ dorms/                 # CRUD หอพัก (owner แก้เองได้ทันที, หอใหม่รออนุมัติ)
│  │  │  ├─ dorms.controller.ts # ค้นหาตามจังหวัด/พิกัด/มหาวิทยาลัย
│  │  │  ├─ dorms.service.ts
│  │  │  └─ dto/                # create-dorm, update-dorm, search-query
│  │  │
│  │  ├─ rooms/                 # ห้อง: แอร์/พัดลม, ราคา, ตัดห้องเมื่อเต็ม (auto)
│  │  │
│  │  ├─ bookings/              # ★ Booking Engine — state machine ตายตัว
│  │  │  ├─ bookings.controller.ts
│  │  │  ├─ bookings.service.ts # pending → confirmed → paid → completed
│  │  │  ├─ booking-state.machine.ts   # ห้ามข้ามสถานะ + ล็อกยกเลิกหลัง 1 วัน
│  │  │  └─ dto/
│  │  │
│  │  ├─ payments/              # โอนเข้าบัญชีกลาง, ตัดยอดเที่ยงคืน, หัก 10%
│  │  │  ├─ payments.service.ts
│  │  │  ├─ payments.cron.ts    # ตัดยอด/รวมยอดภายในเที่ยงคืน (Cron job)
│  │  │  └─ gateway/            # Omise / 2C2P / PromptPay adapter
│  │  │
│  │  ├─ documents/             # ออกใบจอง + ใบเสร็จ PDF
│  │  │  ├─ pdf.service.ts      # สร้าง PDF (puppeteer/pdfkit)
│  │  │  └─ templates/          # booking-slip.hbs, receipt.hbs
│  │  │
│  │  ├─ notifications/         # กระดิ่ง: โปรโมชัน + สถานะการจอง
│  │  │  ├─ notifications.service.ts
│  │  │  └─ push/               # FCM + APNs / Expo Push
│  │  │
│  │  ├─ realtime/              # WebSocket Gateway — คำขอจองเด้งทันทีฝั่ง owner
│  │  │  └─ realtime.gateway.ts
│  │  │
│  │  ├─ promotions/            # Boost, แบนเนอร์, Featured, สปอนเซอร์คาโรเซล
│  │  │
│  │  ├─ uploads/               # รูปหอ, เอกสารแนบ → S3/Object Storage
│  │  │
│  │  └─ admin/                 # เฉพาะฝั่งแอดมิน
│  │     ├─ approvals/          # คิวอนุมัติหอใหม่ (รับ/ไม่รับ)
│  │     ├─ finance/            # รวมบิล, ยอดโอนให้หอ, Export
│  │     ├─ analytics/          # แดชบอร์ด: รายได้, ยอดจองต่อจังหวัด, กราฟ
│  │     └─ admins/             # Super Admin / Admin / Finance / Support
│  │
│  └─ prisma.service.ts
│
├─ test/                        # e2e tests (booking flow ต้องเทสให้ครบ)
├─ nest-cli.json
├─ package.json
└─ tsconfig.json
```

---

## 3. `apps/web` — Next.js (App Router)

> ใช้ **Next.js ตัวเดียว** แบ่งด้วย Route Groups 3 โซน + middleware แยก subdomain ได้ภายหลัง
> (`hopak.com` / `partner.hopak.com` / `admin.hopak.com`)

```
apps/web/
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx             # root layout + font ไทย
│  │  ├─ page.tsx               # หน้าแรก: ค้นหา + สปอนเซอร์คาโรเซล
│  │  │
│  │  ├─ (tenant)/              # ── โซนผู้เช่า ──
│  │  │  ├─ search/page.tsx           # ค้นหาตามจังหวัด/พิกัด/มหาวิทยาลัย
│  │  │  ├─ dorms/[id]/page.tsx       # รายละเอียดหอ + แผนที่ + ปุ่มจอง
│  │  │  ├─ bookings/
│  │  │  │  ├─ page.tsx               # รายการจองของฉัน
│  │  │  │  └─ [id]/page.tsx          # timeline สถานะ + ชำระเงิน + ใบจอง PDF
│  │  │  ├─ notifications/page.tsx    # กระดิ่ง
│  │  │  └─ profile/page.tsx
│  │  │
│  │  ├─ (partner)/partner/     # ── โซนเจ้าของหอ (Owner Console) ──
│  │  │  ├─ layout.tsx                # sidebar เขียว Partner
│  │  │  ├─ dashboard/page.tsx        # รายได้, ยอดจอง, ห้องว่าง, กราฟรายเดือน
│  │  │  ├─ dorms/
│  │  │  │  ├─ new/page.tsx           # เพิ่มหอ: รูป, คำอธิบาย, ปักหมุดแผนที่
│  │  │  │  └─ [id]/edit/page.tsx
│  │  │  ├─ rooms/page.tsx            # จัดการห้อง เปิด/ตัดห้อง
│  │  │  ├─ requests/page.tsx         # คำขอจอง → กดยืนยัน (realtime)
│  │  │  ├─ slips/page.tsx            # ใบจองรายวัน + ปริ้น PDF
│  │  │  └─ settings/page.tsx         # บัญชีรับเงิน / PromptPay
│  │  │
│  │  ├─ (admin)/admin/         # ── โซนแอดมิน ──
│  │  │  ├─ layout.tsx                # sidebar น้ำเงินเข้ม Admin
│  │  │  ├─ dashboard/page.tsx
│  │  │  ├─ bookings/page.tsx         # ทุกการจอง + กรอง + Export
│  │  │  ├─ approvals/page.tsx        # คิวอนุมัติหอ (เอกสาร+พิกัด+เบอร์)
│  │  │  ├─ users/page.tsx
│  │  │  ├─ finance/page.tsx          # หัก 10%, โอนให้หอ, รวมบิล PDF
│  │  │  ├─ campaigns/page.tsx        # โฆษณา & แคมเปญ
│  │  │  └─ admins/page.tsx           # จัดการสิทธิ์แอดมิน
│  │  │
│  │  └─ (auth)/
│  │     ├─ login/page.tsx
│  │     └─ register/page.tsx         # ผู้เช่า + "สมัครเจ้าของหอพัก"
│  │
│  ├─ components/               # ui/ (ปุ่ม การ์ด), dorm/, booking/, map/, charts/
│  ├─ lib/
│  │  ├─ api-client.ts          # fetch wrapper → api.hopak.com (แนบ JWT)
│  │  ├─ auth.ts                # session/token helper
│  │  └─ ws.ts                  # WebSocket client
│  ├─ hooks/                    # useBookings, useDormSearch ฯลฯ
│  └─ middleware.ts             # กัน route ตาม role + แยก subdomain
│
├─ public/
├─ next.config.js
├─ tailwind.config.ts
└─ package.json
```

---

## 4. `apps/mobile` — Expo React Native

> โค้ดชุดเดียว iOS + Android · ใช้ **Expo Router** · รวมทั้งฝั่งผู้เช่าและ Partner (สลับตาม role)

```
apps/mobile/
├─ app/
│  ├─ _layout.tsx               # root: auth check + สลับ role
│  ├─ (auth)/
│  │  ├─ login.tsx              # Google / อีเมล / เบอร์
│  │  ├─ register.tsx
│  │  └─ owner-register.tsx     # "เปิดหอพักกับ Hopak" (SSO บัญชีเดิม)
│  │
│  ├─ (tenant)/                 # ── แอพผู้เช่า (bottom tabs) ──
│  │  ├─ _layout.tsx            # Tabs: ค้นหา · จองของฉัน · แจ้งเตือน · โปรไฟล์
│  │  ├─ index.tsx              # หน้าแรก: ค้นหา + สปอนเซอร์คาโรเซล
│  │  ├─ dorm/[id].tsx          # รายละเอียดหอ + แผนที่
│  │  ├─ booking/
│  │  │  ├─ new.tsx             # ฟอร์มขอจอง (ชื่อ+เบอร์+หมายเหตุ)
│  │  │  ├─ [id].tsx            # timeline สถานะ + ปุ่มยกเลิก (ล็อกหลัง 1 วัน)
│  │  │  └─ pay/[id].tsx        # ชำระเงิน → บัญชีกลาง Hopak
│  │  ├─ notifications.tsx
│  │  └─ profile.tsx
│  │
│  └─ (partner)/                # ── Hopak Partner ──
│     ├─ _layout.tsx            # Tabs: แดชบอร์ด · ห้อง · คำขอจอง · ใบจอง · ตั้งค่า
│     ├─ dashboard.tsx
│     ├─ rooms.tsx
│     ├─ requests.tsx           # ยืนยันคำขอ (เบอร์ถูก mask)
│     ├─ slips.tsx              # ใบจองวันนี้ + ดาวน์โหลด PDF
│     ├─ dorm-edit.tsx
│     └─ settings.tsx           # บัญชีรับเงิน
│
├─ src/
│  ├─ components/
│  ├─ lib/
│  │  ├─ api-client.ts          # ยิง API ตัวเดียวกับเว็บ
│  │  ├─ push.ts                # Expo Notifications (FCM/APNs)
│  │  └─ storage.ts             # SecureStore เก็บ JWT
│  └─ hooks/
│
├─ app.json                     # Expo config (ชื่อแอพ, icon, splash)
├─ eas.json                     # EAS Build → App Store + Google Play
└─ package.json
```

---

## 5. `packages/` — โค้ดใช้ร่วม

```
packages/
├─ shared/
│  ├─ src/
│  │  ├─ types/
│  │  │  ├─ user.ts             # Role = 'tenant' | 'owner' | 'admin'
│  │  │  ├─ dorm.ts
│  │  │  ├─ booking.ts          # BookingStatus = pending|confirmed|paid|cancelled|completed
│  │  │  └─ payment.ts
│  │  ├─ constants/
│  │  │  ├─ provinces.ts        # มหาสารคาม, ขอนแก่น, เชียงใหม่ + จังหวัดอื่น
│  │  │  ├─ universities.ts     # ม.มหาสารคาม ฯลฯ (ใช้ค้นหา)
│  │  │  └─ fees.ts             # COMMISSION_RATE = 0.10
│  │  ├─ logic/
│  │  │  ├─ commission.ts       # ★ สูตรหัก 10% (ใช้ร่วมทุกฝั่ง — ที่เดียว)
│  │  │  ├─ cancellation.ts     # ★ กฎยกเลิกภายใน 1 วัน
│  │  │  └─ phone-mask.ts       # format เบอร์ซ่อนบางส่วน (ฝั่ง display)
│  │  └─ index.ts
│  └─ package.json
│
├─ ui/                          # (optional) shared React components สำหรับ web
│  └─ src/                      # Button, Card, StatusBadge, Chart ฯลฯ
│
└─ config/
   ├─ eslint/
   ├─ tsconfig/                 # base.json, nextjs.json, nestjs.json, expo.json
   └─ package.json
```

---

## 6. `prisma/schema.prisma` — โครงโมเดลหลัก

```prisma
enum Role            { TENANT OWNER ADMIN }
enum AdminRole       { SUPER_ADMIN ADMIN FINANCE SUPPORT }
enum DormStatus      { PENDING_APPROVAL APPROVED REJECTED SUSPENDED }
enum RoomType        { AIR FAN }
enum RoomStatus      { AVAILABLE OCCUPIED }
enum BookingStatus   { PENDING CONFIRMED PAID CANCELLED COMPLETED }
enum PaymentStatus   { PENDING SETTLED TRANSFERRED }

model User      { id, role, name, email, phone, avatarUrl, googleId?, ... }
model Dorm      { id, ownerId, name, description, province, university?,
                  lat, lng, waterRate, electricRate, deposit,
                  amenities Json, images[], status DormStatus, ... }
model Room      { id, dormId, type RoomType, pricePerMonth, status RoomStatus }
model Booking   { id, tenantId, roomId, checkInDate, amount,
                  status BookingStatus, contactName, contactPhone,
                  note?, cancelDeadline DateTime, ... }
model Payment   { id, bookingId, amount, commission,   // = amount * 0.10
                  ownerPayout,                          // = amount - commission
                  method, status PaymentStatus, settledAt?, ... }
model Notification { id, userId, type, title, body, readAt? }
model Campaign  { id, dormId, kind (BOOST|BANNER|FEATURED), startAt, endAt, price }
model Admin     { id, userId, adminRole AdminRole }
model Review    { ... }  // เฟสถัดไป
```

---

## 7. ไฟล์ config ระดับ root

**`pnpm-workspace.yaml`**
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**`turbo.json`** (ย่อ)
```json
{
  "tasks": {
    "build":     { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
    "dev":       { "cache": false, "persistent": true },
    "lint":      {},
    "test":      { "dependsOn": ["build"] },
    "db:migrate": { "cache": false }
  }
}
```

**`.env.example`**
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
S3_BUCKET= / S3_ACCESS_KEY= / S3_SECRET_KEY=
PAYMENT_GATEWAY_KEY=            # Omise / 2C2P
EXPO_PUSH_TOKEN= / FCM_SERVER_KEY=
NEXT_PUBLIC_API_URL=https://api.hopak.com
```

---

## 8. ลำดับสร้างตาม 3 Phase (map กับโครงสร้างนี้)

| Phase | สร้างอะไร | โฟลเดอร์ |
|-------|-----------|----------|
| **1** | Monorepo + Backend API + DB | root config, `packages/shared`, `apps/api` (ครบทุก module + Prisma migrate + seed) |
| **2** | เว็บเรียก API | `apps/web` — เริ่ม (tenant) → (partner) → (admin) |
| **3** | แอพมือถือ | `apps/mobile` — reuse types/logic จาก `packages/shared` + Push + EAS Build |

---

*จุดที่ห้ามพลาด: สูตรหัก 10% และกฎยกเลิก 1 วัน เขียน **ที่เดียว** ใน `packages/shared/logic` แล้ว import ใช้ทั้ง api/web/mobile — จะได้ไม่มีเลขไม่ตรงกันข้ามฝั่ง*
