import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // security headers: HSTS, X-Frame-Options: DENY, nosniff, ฯลฯ
  // - contentSecurityPolicy ปิด: API คืน JSON เป็นหลัก + route ไฟล์ (/uploads, /files) ตั้ง CSP เข้มเองแล้ว
  // - crossOriginResourcePolicy: cross-origin — ให้หน้าเว็บ (app.hoprak.com) โหลดรูปจาก api.hoprak.com ได้
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // อยู่หลัง nginx (prod) — เชื่อ X-Forwarded-For 1 ชั้น เพื่อให้ req.ip เป็น IP จริงของ client
  // (จำเป็นต่อ rate limiter ที่คีย์ตาม IP + การเก็บ ip ใน Session)
  app.set('trust proxy', 1);

  // จำกัด CORS เฉพาะโดเมนหน้าเว็บของเราเอง (prod: FRONTEND_URL เท่านั้น)
  // dev: อนุญาต localhost + 127.0.0.1 ทุกพอร์ตด้วย (เบราว์เซอร์เปิดด้วย host ไหนก็ได้ ไม่ให้ CORS บล็อก)
  const isProd = process.env.NODE_ENV === 'production';
  const frontendUrl = process.env.FRONTEND_URL;
  const devLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // curl / same-origin / server-to-server (ไม่มี Origin header)
      if (frontendUrl && origin === frontendUrl) return cb(null, true);
      if (!isProd && devLocalhost.test(origin)) return cb(null, true);
      cb(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // เสิร์ฟไฟล์อัพโหลด public พร้อม header กัน stored XSS แบบ defense-in-depth:
  // - nosniff: เบราว์เซอร์ห้ามเดา MIME (กันไฟล์รูปปลอมถูกตีความเป็นสคริปต์)
  // - CSP default-src 'none' + sandbox: ถ้ามีไฟล์ .svg/.html หลุด fileFilter มา ก็รันสคริปต์ไม่ได้
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    },
  });
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
