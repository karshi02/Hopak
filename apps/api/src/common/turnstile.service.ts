import { BadRequestException, Injectable, Logger } from '@nestjs/common';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Cloudflare Turnstile — ด่านกันบอทตอนสมัครสมาชิก
 *
 * ตั้ง TURNSTILE_SECRET_KEY แล้วระบบจะบังคับตรวจทุกครั้ง (ไม่มี token = ปฏิเสธ)
 * ไม่ตั้ง = ข้ามการตรวจไปเลย เพื่อให้รันในเครื่อง dev ได้โดยไม่ต้องมีคีย์
 * เจตนา: บน production ต้องตั้งคีย์เสมอ ไม่งั้นด่านนี้เท่ากับไม่มี — ดู DEPLOY.md
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

  async verify(token: string | undefined, ip?: string): Promise<void> {
    if (!this.enabled) return;
    if (!token) throw new BadRequestException('กรุณายืนยันว่าคุณไม่ใช่บอทก่อน');

    const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token });
    if (ip) body.set('remoteip', ip);

    let ok = false;
    let codes: string[] = [];
    try {
      const res = await fetch(VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(8000),
      });
      const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
      ok = data.success === true;
      codes = data['error-codes'] ?? [];
    } catch (err) {
      // Cloudflare ล่ม/เน็ตมีปัญหา = ปฏิเสธไว้ก่อน (fail-closed) ไม่ปล่อยผ่านเพราะตรวจไม่ได้
      this.logger.warn(`ตรวจ Turnstile ไม่สำเร็จ: ${err instanceof Error ? err.message : String(err)}`);
      throw new BadRequestException('ยืนยันตัวตนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }

    if (!ok) {
      this.logger.warn(`Turnstile ปฏิเสธ token: ${codes.join(',') || 'ไม่ระบุสาเหตุ'}`);
      // token ใช้ได้ครั้งเดียว กดสมัครซ้ำด้วย token เดิมจะเข้าเคสนี้ ต้องให้ผู้ใช้ยืนยันใหม่
      throw new BadRequestException('การยืนยันหมดอายุ กรุณายืนยันว่าคุณไม่ใช่บอทอีกครั้ง');
    }
  }
}
