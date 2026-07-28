import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { RATE_LIMIT_KEY, type RateLimitOptions } from '../decorators/rate-limit.decorator';

interface Bucket {
  count: number;
  resetAt: number;
}

// Rate limiter แบบ fixed-window เก็บใน memory — ไม่พึ่ง dependency ภายนอก
// เหมาะกับ prod ที่เป็น API instance เดียว (ถ้าสเกลหลาย instance ในอนาคตค่อยเปลี่ยนไปใช้ Redis)
// key = IP + ชื่อ route → นับแยกต่อ endpoint ต่อ IP
@Injectable()
export class RateLimitGuard implements CanActivate {
  private buckets = new Map<string, Bucket>();
  private lastSweep = Date.now();

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.get<RateLimitOptions>(RATE_LIMIT_KEY, context.getHandler());
    if (!options) return true; // ไม่ได้ตั้ง @RateLimit บน handler นี้ = ไม่จำกัด

    const req = context.switchToHttp().getRequest<Request>();
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const key = `${ip}:${context.getClass().name}.${context.getHandler().name}`;
    const now = Date.now();

    this.sweep(now);

    const bucket = this.buckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
      this.buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return true;
    }

    if (bucket.count >= options.limit) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      throw new HttpException(
        { statusCode: HttpStatus.TOO_MANY_REQUESTS, message: `พยายามมากเกินไป กรุณาลองใหม่ใน ${retryAfter} วินาที` },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    bucket.count += 1;
    return true;
  }

  // ล้าง bucket ที่หมดอายุทุก ~1 นาที กัน map โตไม่จำกัดเมื่อมี IP หลากหลาย
  private sweep(now: number) {
    if (now - this.lastSweep < 60_000) return;
    this.lastSweep = now;
    for (const [key, bucket] of this.buckets) {
      if (now >= bucket.resetAt) this.buckets.delete(key);
    }
  }
}
