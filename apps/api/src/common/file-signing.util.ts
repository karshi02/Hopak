import { createHmac, timingSafeEqual } from 'crypto';
import { requireEnv } from './env.util';

// FILE_SIGNING_SECRET แยกได้ (ไม่บังคับ) แต่ถ้าไม่ตั้ง ต้องมี JWT_SECRET เสมอ — ห้าม fallback 'dev-secret'
const SECRET = process.env.FILE_SIGNING_SECRET || requireEnv('JWT_SECRET');

function sign(key: string, exp: number): string {
  return createHmac('sha256', SECRET).update(`${key}:${exp}`).digest('hex').slice(0, 32);
}

// token = base64url({k: storage key, e: expiry epoch ms, s: hmac}) — self-contained, ไม่ต้อง query DB เพื่อตรวจสอบสิทธิ์
export function signFileKey(key: string, ttlSeconds: number): string {
  const exp = Date.now() + ttlSeconds * 1000;
  return Buffer.from(JSON.stringify({ k: key, e: exp, s: sign(key, exp) })).toString('base64url');
}

export function verifyFileToken(token: string): string | null {
  try {
    const { k, e, s } = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
    if (typeof k !== 'string' || typeof e !== 'number' || typeof s !== 'string') return null;
    if (Date.now() > e) return null;
    if (k.includes('..')) return null;

    const expected = Buffer.from(sign(k, e));
    const actual = Buffer.from(s);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

    return k;
  } catch {
    return null;
  }
}
