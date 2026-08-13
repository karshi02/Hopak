import { Body, Controller, ForbiddenException, Headers, Logger, Post } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';
import { PaymentsService } from './payments.service';

// เทียบแบบเวลาคงที่ กันเดา token ทีละไบต์จากเวลาที่ใช้ตอบ
// hash ก่อนเทียบเพื่อให้บัฟเฟอร์ยาวเท่ากันเสมอ (timingSafeEqual โยน error ถ้าความยาวต่างกัน)
function safeEquals(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

// รับ webhook จาก Xendit เมื่อเงินเข้าจริง — public route (ไม่มี JWT) ยืนยันด้วย x-callback-token แทน
// ตั้ง callback URL ใน Xendit dashboard = https://<domain>/bookings/payment/webhook/xendit
@Controller('bookings/payment/webhook')
export class WebhooksController {
  private logger = new Logger(WebhooksController.name);

  constructor(private paymentsService: PaymentsService) {}

  @Post('xendit')
  async xendit(
    @Headers('x-callback-token') token: string | undefined,
    @Body()
    body: {
      event?: string;
      data?: { qr_id?: string; qr_code?: { id?: string }; status?: string };
    },
  ) {
    // ยืนยันว่ามาจาก Xendit จริง — ไม่มี token ตั้งไว้ = ปฏิเสธทุก callback (fail-closed)
    // ห้ามปล่อยผ่านเวลา env ว่างเด็ดขาด ไม่งั้นใครยิง POST มาก็ยืนยันการจองได้โดยไม่ต้องจ่ายเงิน
    const expected = process.env.XENDIT_WEBHOOK_TOKEN;
    if (!expected) {
      this.logger.error('XENDIT_WEBHOOK_TOKEN ไม่ได้ตั้งค่า — ปฏิเสธ webhook ทั้งหมด');
      throw new ForbiddenException('webhook not configured');
    }
    if (!token || !safeEquals(token, expected)) throw new ForbiddenException('invalid webhook token');

    const status = body.data?.status?.toUpperCase();
    // สนใจเฉพาะเหตุการณ์ที่จ่ายสำเร็จ
    if (status && status !== 'SUCCEEDED' && status !== 'COMPLETED' && status !== 'PAID') {
      return { ok: true, ignored: true };
    }

    const chargeId = body.data?.qr_id ?? body.data?.qr_code?.id;
    if (!chargeId) return { ok: true, ignored: true };

    return this.paymentsService.confirmByCharge(chargeId);
  }
}
