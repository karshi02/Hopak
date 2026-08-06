import { BadRequestException, Injectable } from '@nestjs/common';

export interface XenditCharge {
  chargeId: string; // id ของ QR ฝั่ง Xendit (qr_...) — เก็บไว้ match webhook
  qrString: string; // payload EMV ดิบ — frontend เอาไปเรนเดอร์เป็นรูป QR
  amount: number;
}

// เกตเวย์ Xendit (PromptPay QR แบบ dynamic — ยอดฝังในตัว QR ลูกค้าไม่ต้องพิมพ์ยอด)
// เอกสาร: https://developer.xendit.co/api-reference/#create-qr-code
// ยืนยันเงินเข้าจริงผ่าน webhook (event qr.payment) → payments.service.confirmByCharge()
@Injectable()
export class XenditGateway {
  private readonly base = 'https://api.xendit.co';
  // channel สำหรับ PromptPay ไทย — ปรับผ่าน env ได้เผื่อ Xendit เปลี่ยน code
  private readonly channel = process.env.XENDIT_QR_CHANNEL ?? 'TH_PROMPTPAY';

  private authHeader() {
    const key = process.env.XENDIT_SECRET_KEY;
    if (!key) throw new BadRequestException('ระบบชำระเงินยังไม่ได้ตั้งค่า (XENDIT_SECRET_KEY)');
    // Basic auth: secret key เป็น username, password ว่าง
    return `Basic ${Buffer.from(`${key}:`).toString('base64')}`;
  }

  // สร้าง QR พร้อมเพย์ต่อการจอง — referenceId = bookingId (Xendit ส่งกลับมาใน webhook)
  async createQrCharge(amount: number, referenceId: string): Promise<XenditCharge> {
    let res: Response;
    try {
      res = await fetch(`${this.base}/qr_codes`, {
        method: 'POST',
        headers: {
          Authorization: this.authHeader(),
          'api-version': '2022-07-31',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reference_id: referenceId,
          type: 'DYNAMIC',
          currency: 'THB',
          amount,
          channel_code: this.channel,
        }),
      });
    } catch {
      throw new BadRequestException('เชื่อมต่อระบบชำระเงินไม่ได้ กรุณาลองใหม่');
    }

    const json = (await res.json().catch(() => ({}))) as {
      id?: string;
      qr_string?: string;
      amount?: number;
      message?: string;
      error_code?: string;
    };
    if (!res.ok || !json.id || !json.qr_string) {
      throw new BadRequestException(json.message ?? 'สร้าง QR ชำระเงินไม่สำเร็จ');
    }
    return { chargeId: json.id, qrString: json.qr_string, amount: json.amount ?? amount };
  }
}
