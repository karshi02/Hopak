import { Body, Controller, ForbiddenException, Headers, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';

// รับ webhook จาก Xendit เมื่อเงินเข้าจริง — public route (ไม่มี JWT) ยืนยันด้วย x-callback-token แทน
// ตั้ง callback URL ใน Xendit dashboard = https://<domain>/bookings/payment/webhook/xendit
@Controller('bookings/payment/webhook')
export class WebhooksController {
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
    // ยืนยันว่ามาจาก Xendit จริง — ถ้าตั้ง token ไว้ต้องตรง (prod) ; ไม่ตั้ง = ผ่าน (dev)
    const expected = process.env.XENDIT_WEBHOOK_TOKEN;
    if (expected && token !== expected) throw new ForbiddenException('invalid webhook token');

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
