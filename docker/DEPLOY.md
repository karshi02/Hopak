# Deploy (VPS: 203.170.190.188)

โครงบนเซิร์ฟเวอร์: repo อยู่ที่ `/opt/hopak` · คำสั่ง compose รันจาก `/opt/hopak/docker`

## สิ่งที่ต้องรู้ก่อน

- **compose ของ prod คือ `docker-compose.prod.yml` เท่านั้น** — `docker compose` เปล่าๆ จะหยิบ
  `docker-compose.yml` ซึ่งมีแค่ postgres + redis (เคยพลาดมาแล้ว: สั่ง up แล้ว api ตัวเก่ายังรันอยู่)
- env ของ API อ่านจาก `apps/api/.env.production` (ไม่ใช่ `docker/.env`)
  `docker/.env` มีไว้ให้ compose แทนตัวแปรอย่าง `POSTGRES_PASSWORD`, `NEXT_PUBLIC_*` ตอน build เท่านั้น
- `XENDIT_WEBHOOK_TOKEN` ไม่มี = webhook ถูกปฏิเสธทั้งหมด (fail-closed ตั้งใจให้เป็นแบบนั้น)

## ขั้นตอนปกติ

```bash
cd /opt/hopak && git pull origin main && cd docker
docker compose -f docker-compose.prod.yml build api web
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec -w /app/apps/api api ./node_modules/.bin/prisma migrate deploy
docker compose -f docker-compose.prod.yml ps
```

ตรวจหลัง deploy:

```bash
curl -s -o /dev/null -w "web=%{http_code}\n" https://app.hoprak.com/
curl -s -o /dev/null -w "api=%{http_code}\n" https://api.hoprak.com/dorms
curl -s -o /dev/null -w "asset=%{http_code}\n" https://app.hoprak.com/bank-icons/KBANK.png
# ต้องได้ 403 invalid webhook token (ไม่ใช่ "webhook not configured" และไม่ใช่ 201)
curl -s -X POST https://api.hoprak.com/bookings/payment/webhook/xendit \
  -H "Content-Type: application/json" -d '{}'
```

## nginx

ไฟล์บนเซิร์ฟเวอร์ (อย่าสับสน มีชื่อคล้ายกันหลายอัน):

| ไฟล์จริงที่ nginx ใช้ | มาจากรีโป |
|---|---|
| `/etc/nginx/sites-available/hoprak.com` (symlink จาก `sites-enabled/`) | `docker/nginx-hopak.conf` |
| `/etc/nginx/conf.d/hopak-ratelimit.conf` | `docker/nginx-hopak-ratelimit.conf` |

- `limit_req_zone` ต้องอยู่ในไฟล์ ratelimit ไฟล์เดียว ประกาศซ้ำ = nginx ไม่สตาร์ท
  (`limit_req_zone "auth_limit" is already bound to key`)
- `/etc/nginx/sites-available/nginx-hopak.conf` เป็นของเก่าที่ไม่ได้ถูกใช้ ไม่ต้องสนใจ

**ไฟล์บนเซิร์ฟเวอร์ไม่ตรงกับรีโป** — certbot เติม block `listen 443` + path ใบรับรองเข้าไปเอง
ก๊อปทับจากรีโปตรงๆ = SSL หาย ถ้าจำเป็นต้องอัปเดต server block:

```bash
cp /etc/nginx/sites-available/hoprak.com /root/hoprak.com.with-ssl.bak   # สำรองก่อนเสมอ
cp /opt/hopak/docker/nginx-hopak.conf /etc/nginx/sites-available/hoprak.com
nginx -t && systemctl reload nginx
certbot --nginx --redirect -d hoprak.com -d www.hoprak.com -d app.hoprak.com -d api.hoprak.com
```

`/.well-known/acme-challenge/` ต้องมาก่อน redirect ในทุก server block ไม่งั้นต่ออายุใบรับรองไม่ผ่าน

## DNS (HostAtom / DirectAdmin)

A record ทั้ง 4 ชี้ VPS แล้ว: `@` · `www` · `app` · `api` → `203.170.190.188`
`mail` / `pop` / `smtp` / `ftp` → `103.30.127.7` (อีเมลของโฮสต์) **ห้ามแตะ** ไม่งั้นเมลล่ม

## Xendit

ตั้ง callback URL ใน dashboard (Settings → Developers → Webhooks):

| Product | URL |
|---|---|
| QR CODES → QR code paid & refunded | `https://api.hoprak.com/bookings/payment/webhook/xendit` |
| DISBURSEMENT → Payouts v2 | `https://api.hoprak.com/bookings/payment/webhook/xendit/payout` |

**ตอนนี้ยังเป็น development mode** (คีย์ `xnd_public_development_...`) เงินไม่จริง
พอ KYC ผ่านต้องเปลี่ยนพร้อมกัน 3 ตัวใน `apps/api/.env.production`:
secret key, public key และ **webhook verification token ของ live mode** (คนละตัวกับ test)

## สคริปต์ดูแลข้อมูล

```bash
# ดูก่อนว่าจะแตะบัญชีไหน (dry-run เป็นค่าเริ่มต้น)
docker compose -f docker-compose.prod.yml exec -w /app/apps/api api \
  node scripts/backfill-owner-email-verified.js
# รันจริง
docker compose -f docker-compose.prod.yml exec -w /app/apps/api api \
  node scripts/backfill-owner-email-verified.js --apply

# ตรวจว่าบัญชีที่ emailVerified = true มีหลักฐาน OTP รองรับจริงไหม (--fix = ตั้งกลับเป็น false)
docker compose -f docker-compose.prod.yml exec -w /app/apps/api api \
  node scripts/audit-owner-email-verified.js
```
