import { BadRequestException, Injectable, Logger } from '@nestjs/common';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const VERIFY_TIMEOUT_MS = 10_000;
const MAX_TOKEN_LENGTH = 2048;

/**
 * Cloudflare Turnstile — ด่านกันบอทตอนสมัครสมาชิก
 *
 * ตั้ง TURNSTILE_SECRET_KEY แล้วระบบจะบังคับตรวจทุกครั้ง (ไม่มี token = ปฏิเสธ)
 * ไม่ตั้ง = ข้ามการตรวจไปเลย เพื่อให้รันในเครื่อง dev ได้โดยไม่ต้องมีคีย์
 * เจตนา: บน production ต้องตั้งคีย์เสมอ ไม่งั้นด่านนี้เท่ากับไม่มี — ดู DEPLOY.md
 *
 * ตรวจครบตามที่ Cloudflare กำหนด: token ใช้ครั้งเดียว · ส่ง remoteip ไปด้วย ·
 * เทียบ action ว่าเป็นฟอร์มที่คาดไว้จริง · เทียบ hostname กับรายชื่อโดเมนที่อนุญาต ·
 * timeout 10 วินาที · ล้มเหลว = ปฏิเสธ (fail-closed)
 *
 * คีย์ทดสอบของ Cloudflare (ผ่านตลอด ใช้ตอน dev ได้):
 *   site   1x00000000000000000000AA
 *   secret 1x0000000000000000000000000000000AA
 */
@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);

  get enabled(): boolean {
    return !!process.env.TURNSTILE_SECRET_KEY;
  }

  /**
   * โดเมนที่ยอมรับ token ได้ — ตั้งผ่าน TURNSTILE_HOSTNAMES (คั่นด้วยจุลภาค)
   * ไม่ตั้ง = เดาจาก FRONTEND_URL และเติม localhost ให้เฉพาะตอนไม่ใช่ production
   * (production ต้องไม่มี localhost ในรายชื่อ ไม่งั้น token ที่ออกจากเครื่องใครก็ได้ผ่าน)
   */
  private allowedHostnames(): string[] {
    const fromEnv = (process.env.TURNSTILE_HOSTNAMES ?? '')
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean);
    if (fromEnv.length) return fromEnv;

    const hosts: string[] = [];
    try {
      const frontend = process.env.FRONTEND_URL;
      if (frontend) hosts.push(new URL(frontend).hostname);
    } catch {
      // FRONTEND_URL ผิดรูป — ปล่อยผ่าน ไปใช้ค่าที่เหลือ
    }
    if (process.env.NODE_ENV !== 'production') hosts.push('localhost', '127.0.0.1');
    return hosts;
  }

  /**
   * @param token   ค่า cf-turnstile-response จากวิดเจ็ต
   * @param ip      IP ผู้ใช้ (ช่วยจับ token ที่ถูกขโมยไปใช้จากที่อื่น)
   * @param action  ชื่อฟอร์มที่คาดไว้ ต้องตรงกับ data-action ฝั่งหน้าเว็บ
   */
  async verify(token: string | undefined, ip?: string, action?: string): Promise<void> {
    if (!this.enabled) return;
    if (typeof token !== 'string' || !token.length || token.length > MAX_TOKEN_LENGTH) {
      throw new BadRequestException('กรุณายืนยันว่าคุณไม่ใช่บอทก่อน');
    }

    const allowed = this.allowedHostnames();
    if (!allowed.length) {
      // ตั้งคีย์ไว้แต่ไม่รู้ว่าโดเมนไหนใช้ได้ = ตรวจไม่ครบ ปฏิเสธไว้ก่อนดีกว่าปล่อยผ่าน
      this.logger.error('ตั้ง TURNSTILE_SECRET_KEY ไว้ แต่ไม่มี TURNSTILE_HOSTNAMES/FRONTEND_URL ให้เทียบโดเมน');
      throw new BadRequestException('ยืนยันตัวตนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }

    const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token });
    if (ip) body.set('remoteip', ip);

    let data: { success?: boolean; action?: string; hostname?: string; 'error-codes'?: string[] };
    try {
      const res = await fetch(VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`siteverify ${res.status}`);
      data = (await res.json()) as typeof data;
    } catch (err) {
      // Cloudflare ล่ม/เน็ตมีปัญหา = ปฏิเสธไว้ก่อน (fail-closed) ไม่ปล่อยผ่านเพราะตรวจไม่ได้
      this.logger.warn(`ตรวจ Turnstile ไม่สำเร็จ: ${err instanceof Error ? err.message : String(err)}`);
      throw new BadRequestException('ยืนยันตัวตนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }

    if (!data.success) {
      const codes = data['error-codes'] ?? [];
      this.logger.warn(`Turnstile ปฏิเสธ token: ${codes.join(',') || 'ไม่ระบุสาเหตุ'}`);
      // token ใช้ได้ครั้งเดียว กดสมัครซ้ำด้วย token เดิมจะเข้าเคสนี้ ต้องให้ผู้ใช้ยืนยันใหม่
      throw new BadRequestException('การยืนยันหมดอายุ กรุณายืนยันว่าคุณไม่ใช่บอทอีกครั้ง');
    }

    // token ที่ผ่านจริง แต่ออกมาจากฟอร์มอื่น/โดเมนอื่น = เอามาใช้ข้ามที่ ไม่รับ
    if (action && data.action !== action) {
      this.logger.warn(`Turnstile action ไม่ตรง: ได้ ${data.action ?? '-'} คาดว่า ${action}`);
      throw new BadRequestException('การยืนยันไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
    }
    if (!data.hostname || !allowed.includes(data.hostname)) {
      this.logger.warn(`Turnstile hostname ไม่อยู่ในรายชื่อที่อนุญาต: ${data.hostname ?? '-'}`);
      throw new BadRequestException('การยืนยันไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
    }
  }
}
