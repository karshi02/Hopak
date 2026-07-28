import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitOptions {
  limit: number; // จำนวนครั้งสูงสุดต่อหน้าต่างเวลา
  windowMs: number; // ความยาวหน้าต่างเวลา (มิลลิวินาที)
}

// จำกัดจำนวนครั้งที่ยิง endpoint ต่อ IP ต่อช่วงเวลา — ใช้กับ endpoint กลุ่ม auth
// (login เดารหัส, forgot-password/OTP สแปมอีเมล) คู่กับ RateLimitGuard
export const RateLimit = (limit: number, windowMs: number) =>
  SetMetadata(RATE_LIMIT_KEY, { limit, windowMs } satisfies RateLimitOptions);
