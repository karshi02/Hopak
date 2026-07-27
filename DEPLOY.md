# Deploy Hopak ไปยัง Cloud VPS (hoprak.com)

ทำตามลำดับนี้ รันคำสั่งบน VPS ผ่าน SSH เอง (ผมไม่มีสิทธิ์เข้า VPS/DNS panel ของ user)

## 0. เตรียมไฟล์ก่อน push/pull ขึ้น VPS

ไฟล์เหล่านี้สร้างไว้ให้แล้วในเครื่อง (มีค่าจริง/secret สุ่มไว้แล้ว ไม่ถูก commit เพราะอยู่ใน `.gitignore`):
- `apps/api/.env.production`
- `docker/.env`

**ต้องคัดลอก 2 ไฟล์นี้ขึ้น VPS ด้วยมือ** (scp/sftp) เพราะ git จะไม่พาไปด้วย — เช่น:
```
scp apps/api/.env.production root@<VPS_IP>:/opt/hopak/apps/api/.env.production
scp docker/.env root@<VPS_IP>:/opt/hopak/docker/.env
```

ก่อนอัปโหลด ทบทวนค่าที่ยังเป็นช่องว่างใน `apps/api/.env.production`:
- `S3_BUCKET` / `S3_ACCESS_KEY` / `S3_SECRET_KEY` — ว่างไว้ได้ (fallback เก็บลงดิสก์ในคอนเทนเนอร์ ผ่าน volume `api_uploads` กันข้อมูลหายอยู่แล้ว)
- `SMTP_FROM` — ยังใช้ `onboarding@resend.dev` ไปก่อน จนกว่าจะ verify โดเมน hoprak.com ผ่าน Resend (ดู `Bug/resend-domain-verify-pending.txt`)

## 1. DNS ที่ registrar (Hostatom)

ชี้ A record ไปที่ IP ของ Cloud VPS SSD2:
```
app.hoprak.com   A   <VPS_IP>
api.hoprak.com   A   <VPS_IP>
hoprak.com       A   <VPS_IP>   (root — จะ redirect ไป app.hoprak.com ทาง nginx)
```
รอ DNS propagate (ปกติไม่กี่นาทีถึง 1 ชม.) เช็คด้วย `nslookup app.hoprak.com`

## 2. ติดตั้ง Docker บน VPS (ครั้งแรกเท่านั้น)

```bash
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin nginx certbot python3-certbot-nginx
```

## 3. Clone/pull โค้ดขึ้น VPS

```bash
git clone <repo-url> /opt/hopak
cd /opt/hopak
# วางไฟล์ .env.production และ docker/.env ตามขั้นตอนที่ 0
```

## 4. Build + รัน container

```bash
cd /opt/hopak/docker
docker compose -f docker-compose.prod.yml up -d --build
```

## 5. รัน migration ครั้งแรก (สร้าง table ใน DB production)

```bash
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

## 6. ตั้งค่า nginx (reverse proxy host จริง ไม่ใช่ container)

```bash
cp /opt/hopak/docker/nginx-hopak.conf /etc/nginx/sites-available/hoprak.com
ln -s /etc/nginx/sites-available/hoprak.com /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

## 7. ออก SSL certificate (HTTPS)

```bash
certbot --nginx -d app.hoprak.com -d api.hoprak.com -d hoprak.com
```
certbot จะแก้ nginx config ให้เองเพื่อเพิ่ม `listen 443 ssl` + auto-renew ตั้งไว้แล้ว (ไม่ต้องทำเพิ่ม)

## 8. Google OAuth (ทำในเบราว์เซอร์ ไม่ใช่ SSH)

เข้า [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → OAuth Client เดิม → เพิ่ม:
- Authorized redirect URI: `https://api.hoprak.com/auth/google/callback`
- Authorized JavaScript origin: `https://app.hoprak.com`

## 9. Resend domain verify (อีเมลจริง)

ทำตาม `Bug/resend-domain-verify-pending.txt` (อัปเดตชื่อโดเมนเป็น hoprak.com ให้แล้ว) — เพิ่ม DNS record ที่ registrar, verify ผ่าน resend.com/domains, แล้วค่อยเปลี่ยน `SMTP_FROM` ใน `apps/api/.env.production` เป็น `noreply@hoprak.com` + restart container:
```bash
docker compose -f docker-compose.prod.yml restart api
```

## 10. ทดสอบให้ครบก่อนบอกว่าเสร็จ

- เปิด `https://app.hoprak.com` — เข้าหน้าแรกได้, ค้นหาหอพักได้
- ล็อกอิน tenant/owner/admin ทดสอบ (`https://app.hoprak.com/portal-9f3k/login` สำหรับแอดมิน)
- ล็อกอิน Google ทดสอบ (ต้องรอขั้นตอน 8 เสร็จก่อน)
- อัปโหลดรูปหอพัก เช็คว่าโชว์จริงผ่าน HTTPS
- เช็ค cert ผ่าน `https://www.ssllabs.com/ssltest/` หรือแค่ดู lock icon ในเบราว์เซอร์

## หมายเหตุความปลอดภัย

- `apps/api/.env.production` และ `docker/.env` มี secret จริง (JWT secret, DB password) — **ห้าม commit เข้า git เด็ดขาด** (อยู่ใน `.gitignore` ป้องกันไว้แล้ว แต่เช็ค `git status` ก่อน commit ทุกครั้งเพื่อความชัวร์)
- `JWT_SECRET` ที่สุ่มไว้ให้คนละตัวกับ `dev-secret-change-in-production` ที่ใช้ตอน dev แล้ว — อย่าย้อนกลับไปใช้ค่า dev
