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

// รับ webhook จาก Xendit — public route (ไม่มี JWT) ยืนยันด้วย x-callback-token แทน
// ตั้ง callback URL ใน Xendit dashboard:
//   QR CODES (qr.payment)      -> https://<domain>/bookings/payment/webhook/xendit
//   PAYOUTS v2 (payout.*)      -> https://<domain>/bookings/payment/webhook/xendit/payout
@Controller('bookings/payment/webhook')
export class WebhooksController {
  private logger = new Logger(WebhooksController.name);

  constructor(private paymentsService: PaymentsService) {}

  // ตรวจ token ให้ทุก route ในไฟล์นี้ — ไม่มี token ตั้งไว้ = ปฏิเสธหมด (fail-closed)
  // ห้ามปล่อยผ่านเวลา env ว่างเด็ดขาด ไม่งั้นใครยิง POST มาก็ยืนยันการจองได้โดยไม่ต้องจ่ายเงิน
  private assertFromXendit(token: string | undefined) {
    const expected = process.env.XENDIT_WEBHOOK_TOKEN;
    if (!expected) {
      this.logger.error('XENDIT_WEBHOOK_TOKEN ไม่ได้ตั้งค่า — ปฏิเสธ webhook ทั้งหมด');
      throw new ForbiddenException('webhook not configured');
    }
    if (!token || !safeEquals(token, expected)) throw new ForbiddenException('invalid webhook token');
  }

  @Post('xendit')
  async xendit(
    @Headers('x-callback-token') token: string | undefined,
    @Body()
    body: {
      event?: string;
      data?: {
        qr_id?: string;
        qr_code?: { id?: string };
        status?: string;
        amount?: number;
        currency?: string;
      };
    },
  ) {
    this.assertFromXendit(token);

    const status = body.data?.status?.toUpperCase();
    // สนใจเฉพาะเหตุการณ์ที่จ่ายสำเร็จ
    if (status && status !== 'SUCCEEDED' && status !== 'COMPLETED' && status !== 'PAID') {
      return { ok: true, ignored: true };
    }

    const chargeId = body.data?.qr_id ?? body.data?.qr_code?.id;
    if (!chargeId) return { ok: true, ignored: true };

    // ส่งยอด/สกุลเงินที่ webhook แจ้งไปเทียบกับยอดที่ต้องจ่ายจริงด้วย
    // token พิสูจน์แค่ว่า "มาจาก Xendit" ไม่ได้พิสูจน์ว่าจ่ายครบ — จ่ายไม่ครบต้องไม่ถือว่าชำระแล้ว
    return this.paymentsService.confirmByCharge(chargeId, {
      amount: body.data?.amount,
      currency: body.data?.currency,
    });
  }

  /**
   * ผลการโอนเงินออกให้เจ้าของหอ (Xendit Payouts v2)
   * event: payout.succeeded / payout.failed / payout.reversed
   * โอนล้มเหลว = ต้องดึงยอดกลับมาเป็น "รอโอน" ไม่งั้นค้างเป็นโอนแล้วทั้งที่เงินไม่ถึงเจ้าของหอ
   */
  @Post('xendit/payout')
  async xenditPayout(
    @Headers('x-callback-token') token: string | undefined,
    @Body()
    body: {
      event?: string;
      data?: { id?: string; reference_id?: string; status?: string; failure_code?: string };
    },
  ) {
    this.assertFromXendit(token);

    const payoutId = body.data?.id;
    const referenceId = body.data?.reference_id;
    if (!payoutId && !referenceId) return { ok: true, ignored: true };

    // สถานะมาได้ทั้งใน data.status และชื่อ event — ใช้ตัวที่มี
    const status = (body.data?.status ?? body.event?.split('.').pop() ?? '').toUpperCase();

    return this.paymentsService.applyPayoutResult({
      payoutId,
      referenceId,
      status,
      failureCode: body.data?.failure_code,
    });
  }
}
