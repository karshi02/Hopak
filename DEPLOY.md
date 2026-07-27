# Deploy Hopak ไปยัง Cloud VPS (hoprak.com)

ทำตามลำดับนี้ รันคำสั่งบน VPS ผ่าน SSH เอง (ผมไม่มีสิทธิ์เข้า VPS/DNS panel ของ user)

**เรื่อง local:** ทุกขั้นตอนด้านล่างทำบน VPS (203.170.190.188) เท่านั้น ไม่กระทบเครื่อง local
ที่ใช้ dev อยู่เลยแม้แต่นิดเดียว — เพราะ (1) เป็นคนละเครื่อง คนละ docker daemon กันขาดจาก
กันจริง (2) local ใช้ `apps/api/.env` (DATABASE_URL ชี้ Postgres บนเครื่อง local เอง) ส่วน
VPS ใช้ `apps/api/.env.production` (DATABASE_URL ชี้ Postgres ที่รันในคอนเทนเนอร์บน VPS) —
คนละไฟล์ คนละฐานข้อมูลกันชัดเจน ลบ/wipe บน VPS ไม่มีทางลามมา local ได้ ต่อให้ลบ
`postgres_data` volume บน VPS ทิ้งหมด ข้อมูลที่ใช้ทดสอบบนเครื่อง local (dev DB) ก็ยังอยู่
ครบเหมือนเดิมทุกตัว

---

## 0. Teardown — ลบของเก่าทั้งหมดบน VPS ก่อน (เริ่มจากศูนย์จริงๆ)

ทำรอบนี้เพราะรอบก่อนหน้า nginx บน VPS ไม่ได้ apply config ที่เตรียมไว้ในโปรเจกต์จริง
(server_name ไม่แยก โดเมน api/app/root ตอบเนื้อหาเดียวกันหมด, HTTPS ไม่เคยตั้ง — ดู
`Bug/bugs.txt` [39]) เลยรื้อทิ้งให้สะอาดแล้วเริ่มใหม่ทั้งชุดง่ายกว่าไล่แก้ทีละจุด

```bash
# หยุด + ลบ container ทั้งหมด รวม volume (ฐานข้อมูล + ไฟล์อัปโหลด) — ข้อมูลหายถาวรจากตรงนี้
cd /opt/hopak/docker
docker compose -f docker-compose.prod.yml down -v

# ลบ image เก่าที่ build ค้างไว้ (กันสับสนกับ build ใหม่)
docker image prune -af

# ลบ nginx site เก่าทั้งหมดที่เคยตั้งไว้ (รวม default ที่มักจะ catch-all ทุก Host แล้ว
# proxy ไป :3001 อยู่ก่อนแล้ว — เป็นสาเหตุจริงที่ทำให้ api.hoprak.com ตอบหน้าเว็บผิด)
rm -f /etc/nginx/sites-enabled/*
rm -f /etc/nginx/sites-available/hoprak.com
nginx -t && systemctl reload nginx

# ลบ SSL cert เก่า (ถ้าเคยออกไว้ค้างแบบผิดโดเมน) — ข้ามได้ถ้าไม่เคยออกสำเร็จมาก่อน
certbot delete --cert-name hoprak.com 2>/dev/null || true

# ลบโค้ดเก่าทิ้งทั้งโฟลเดอร์ (จะ clone ใหม่ในขั้นตอนถัดไป)
rm -rf /opt/hopak
```

เช็คให้ชัวร์ว่าสะอาดจริงก่อนไปต่อ:
```bash
docker ps -a        # ต้องว่างเปล่า (ไม่มี container ของ hopak เหลือ)
docker volume ls    # ต้องไม่มี docker_postgres_data / docker_api_uploads เหลือ
ls /etc/nginx/sites-enabled/   # ต้องว่างเปล่า
```

---

## 1. เตรียมไฟล์ก่อน push/pull ขึ้น VPS

ไฟล์เหล่านี้สร้างไว้ให้แล้วในเครื่อง local (มีค่าจริง/secret สุ่มไว้แล้ว ไม่ถูก commit เพราะอยู่ใน `.gitignore`):
- `apps/api/.env.production`
- `docker/.env`

**ต้องคัดลอก 2 ไฟล์นี้ขึ้น VPS ด้วยมือ** (scp/sftp) เพราะ git จะไม่พาไปด้วย — รอ clone เสร็จ
ในขั้นตอนที่ 3 ก่อน แล้วค่อย scp เข้าไปที่ path จริง เช่น:
```
scp apps/api/.env.production root@203.170.190.188:/opt/hopak/apps/api/.env.production
scp docker/.env root@203.170.190.188:/opt/hopak/docker/.env
```

ก่อนอัปโหลด ทบทวนค่าที่ยังเป็นช่องว่างใน `apps/api/.env.production`:
- `S3_BUCKET` / `S3_ACCESS_KEY` / `S3_SECRET_KEY` — ว่างไว้ได้ (fallback เก็บลงดิสก์ในคอนเทนเนอร์ ผ่าน volume `api_uploads` กันข้อมูลหายอยู่แล้ว)
- `SMTP_FROM` — ยังใช้ `onboarding@resend.dev` ไปก่อน จนกว่าจะ verify โดเมน hoprak.com ผ่าน Resend (ดู `Bug/resend-domain-verify-pending.txt`)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — ต้องอัปเดต redirect URI ใน Google Cloud Console เป็น `https://api.hoprak.com/auth/google/callback` ใหม่ (ดูขั้นตอน 9)

## 2. DNS ที่ registrar (Hostatom) — ทำไปแล้ว ข้ามได้

NS ชี้ th13/th14.hostatom.com, A record ของ `hoprak.com` / `www` / `app` / `api` ชี้
`203.170.190.188` ครบแล้ว (เช็คแล้ว 27/07/2026) ไม่ต้องแก้อะไรในขั้นตอนนี้อีก

## 3. ติดตั้ง Docker บน VPS (ถ้ายังไม่มี — เช็คด้วย `docker --version` ก่อน)

```bash
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin nginx certbot python3-certbot-nginx
```

## 4. Clone โค้ดใหม่ขึ้น VPS

```bash
git clone <repo-url> /opt/hopak
cd /opt/hopak
# วางไฟล์ .env.production และ docker/.env ตามขั้นตอนที่ 1
```

## 5. Build + รัน container

```bash
cd /opt/hopak/docker
docker compose -f docker-compose.prod.yml up -d --build
```

## 6. Migrate + seed ฐานข้อมูล (DB ว่างเปล่าสนิท — ไม่มีข้อมูลเก่าเหลือจาก teardown ขั้นตอน 0)

```bash
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
docker compose -f docker-compose.prod.yml exec api npm run db:seed
```
`db:seed` สร้างบัญชี admin เริ่มต้นให้ (รหัสผ่านทดสอบตาม `prisma/seed.ts`) — เข้าเปลี่ยนรหัส
จริงทันทีหลัง login ครั้งแรก อย่าใช้รหัส seed ค้างไว้บน production

## 7. ตั้งค่า nginx ให้แยก 3 โดเมนจริง (จุดที่พังรอบก่อน — เช็คให้แน่ใจว่าไม่มี default site เหลือ)

```bash
ls /etc/nginx/sites-enabled/    # ต้องว่างจากขั้นตอน teardown แล้ว ถ้ามีไฟล์อื่นเหลือ ลบทิ้งก่อน
cp /opt/hopak/docker/nginx-hopak.conf /etc/nginx/sites-available/hoprak.com
ln -s /etc/nginx/sites-available/hoprak.com /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

ทดสอบทันทีว่าแยกโดเมนถูกจริง (สำคัญ — รอบก่อนไม่ได้เช็คจุดนี้เลยเลยไม่รู้ว่าพัง):
```bash
curl -sI -H "Host: api.hoprak.com" http://localhost   # ต้องเห็น response จาก NestJS ไม่ใช่ Next.js
curl -sI -H "Host: app.hoprak.com" http://localhost   # ต้องเห็น Next.js
curl -sI -H "Host: hoprak.com" http://localhost       # ต้อง 301 ไป app.hoprak.com
```

## 8. ออก SSL certificate (HTTPS) — ยังไม่เคยทำสำเร็จมาก่อน (port 443 closed อยู่ตอนนี้)

```bash
certbot --nginx -d app.hoprak.com -d api.hoprak.com -d hoprak.com -d www.hoprak.com
```
certbot จะแก้ nginx config ให้เองเพื่อเพิ่ม `listen 443 ssl` + auto-renew ตั้งไว้แล้ว (ไม่ต้องทำเพิ่ม)
ต้องเปิด port 443 ที่ firewall/security group ของ VPS ด้วยถ้ายัง block อยู่ (`ufw allow 443/tcp`)

## 9. Google OAuth (ทำในเบราว์เซอร์ ไม่ใช่ SSH)

เข้า [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → OAuth Client เดิม → เพิ่ม/แก้:
- Authorized redirect URI: `https://api.hoprak.com/auth/google/callback`
- Authorized JavaScript origin: `https://app.hoprak.com`

## 10. Resend domain verify (อีเมลจริง)

ทำตาม `Bug/resend-domain-verify-pending.txt` — เพิ่ม DNS record ที่ registrar, verify ผ่าน
resend.com/domains, แล้วค่อยเปลี่ยน `SMTP_FROM` ใน `apps/api/.env.production` เป็น
`noreply@hoprak.com` + restart container:
```bash
docker compose -f docker-compose.prod.yml restart api
```

## 11. ทดสอบให้ครบก่อนบอกว่าเสร็จ

- เปิด `https://app.hoprak.com` — เข้าหน้าแรกได้, ค้นหาหอพักได้
- เปิด `https://api.hoprak.com/health` (หรือ endpoint ใดๆ) — ต้องได้ response จาก NestJS จริง ไม่ใช่หน้าเว็บ
- ล็อกอิน admin ด้วยบัญชี seed แล้วเปลี่ยนรหัสทันที (`https://app.hoprak.com/portal-9f3k/login`)
- ล็อกอิน Google ทดสอบ (ต้องรอขั้นตอน 9 เสร็จก่อน)
- อัปโหลดรูปหอพัก เช็คว่าโชว์จริงผ่าน HTTPS
- เช็ค cert ผ่าน `https://www.ssllabs.com/ssltest/` หรือแค่ดู lock icon ในเบราว์เซอร์

## หมายเหตุความปลอดภัย

- `apps/api/.env.production` และ `docker/.env` มี secret จริง (JWT secret, DB password) — **ห้าม commit เข้า git เด็ดขาด** (อยู่ใน `.gitignore` ป้องกันไว้แล้ว แต่เช็ค `git status` ก่อน commit ทุกครั้งเพื่อความชัวร์)
- `JWT_SECRET` ที่สุ่มไว้ให้คนละตัวกับ `dev-secret-change-in-production` ที่ใช้ตอน dev แล้ว — อย่าย้อนกลับไปใช้ค่า dev
- ขั้นตอนที่ 0 (teardown) ลบข้อมูลถาวร ไม่มีทาง undo — ถ้ามีข้อมูลจริงของผู้ใช้จริงอยู่บน production DB ก่อนหน้านี้ (ไม่ใช่แค่ข้อมูลทดสอบ) ต้อง `pg_dump` สำรองไว้ก่อนขั้นตอน 0 เท่านั้น (ไม่ได้รวมอยู่ใน runbook นี้เพราะ user ยืนยันแล้วว่าต้องการเริ่มจากศูนย์จริง)
