import { BadRequestException, Injectable, Logger } from '@nestjs/common';

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
  private logger = new Logger(XenditGateway.name);
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
    // เรียกนอก try — ไม่งั้น "ยังไม่ได้ตั้งค่าคีย์" จะโดน catch ของ network กลืน
    // แล้วขึ้นเป็น "เชื่อมต่อไม่ได้" ทั้งที่ปัญหาคือ env หาย (เคยหลงทางเพราะเรื่องนี้มาแล้ว)
    const auth = this.authHeader();

    let res: Response;
    try {
      res = await fetch(`${this.base}/qr_codes`, {
        method: 'POST',
        headers: {
          Authorization: auth,
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
    } catch (err) {
      this.logger.error(`เรียก Xendit ไม่สำเร็จ (network) booking=${referenceId}: ${String(err)}`);
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
      // log ให้เห็นสาเหตุจริงจาก Xendit (คีย์ผิด / IP ไม่อยู่ใน allowlist / channel ไม่เปิด)
      // ผู้ใช้เห็นแค่ข้อความกลางๆ ไม่หลุดรายละเอียดระบบออกหน้าเว็บ
      this.logger.error(
        `Xendit สร้าง QR ไม่สำเร็จ booking=${referenceId} status=${res.status} ` +
          `code=${json.error_code ?? '-'} message=${json.message ?? '-'}`,
      );
      throw new BadRequestException(json.message ?? 'สร้าง QR ชำระเงินไม่สำเร็จ');
    }
    return { chargeId: json.id, qrString: json.qr_string, amount: json.amount ?? amount };
  }
}
