import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // อยู่หลัง nginx (prod) — เชื่อ X-Forwarded-For 1 ชั้น เพื่อให้ req.ip เป็น IP จริงของ client
  // (จำเป็นต่อ rate limiter ที่คีย์ตาม IP + การเก็บ ip ใน Session)
  app.set('trust proxy', 1);

  // จำกัด CORS เฉพาะโดเมนหน้าเว็บของเราเอง (prod: FRONTEND_URL) — เดิมเปิดทุก origin
  // dev ไม่ตั้ง FRONTEND_URL ก็อนุญาต localhost ทั้งหมดเพื่อความสะดวก
  const frontendUrl = process.env.FRONTEND_URL;
  app.enableCors({
    origin: frontendUrl ? [frontendUrl] : /^http:\/\/localhost(:\d+)?$/,
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
