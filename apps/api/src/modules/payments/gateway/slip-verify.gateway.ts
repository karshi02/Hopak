import { BadRequestException, Injectable } from '@nestjs/common';

// ผลตรวจสลิปที่ผ่านแล้ว — ยอด, เลขอ้างอิงธุรกรรม (transRef ใช้กันสลิปซ้ำ), ชื่อผู้รับปลายทาง
export interface SlipVerifyResult {
  transRef: string;
  amount: number;
  receiverName?: string;
}

// ตรวจสลิปโอนเงินว่า "จ่ายจริง" — โหมดตาม env PAYMENT_VERIFY_MODE:
//   slipok = ยิงรูปสลิปไป SlipOK API เช็คกับธนาคารจริง (ยอด/ผู้รับ/เลขอ้างอิง)
//   stub   = ข้ามการเช็ค (dev เท่านั้น) แต่ยังบังคับแนบสลิป — กัน "กดปุ่ม=จ่ายสำเร็จ" โดยไม่มีสลิป
// ต่อเจ้าอื่น (RDCW / OpenAPI ธนาคาร) = เพิ่ม branch ในเมธอด verify ตรงนี้ที่เดียว
@Injectable()
export class SlipVerifyGateway {
  private readonly mode = (process.env.PAYMENT_VERIFY_MODE ?? 'stub').toLowerCase();

  async verify(slip: Express.Multer.File, expectedAmount: number): Promise<SlipVerifyResult> {
    if (!slip) throw new BadRequestException('กรุณาแนบสลิปโอนเงิน');

    if (this.mode === 'slipok') return this.verifyWithSlipOk(slip, expectedAmount);

    // stub (dev): ไม่เช็คกับธนาคาร — transRef สุ่มไม่ซ้ำ กัน unique ชนตอนกดจ่ายซ้ำ
    return { transRef: `stub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, amount: expectedAmount };
  }

  // SlipOK: POST multipart รูปสลิป → คืน { success, data:{ transRef, amount, receiver:{ displayName } } }
  // โยน error พร้อมเหตุผลถ้า: เรียกไม่ผ่าน / สลิปปลอม / สลิปซ้ำ (SlipOK ก็ dedupe เอง) / ยอดไม่ถึง
  private async verifyWithSlipOk(slip: Express.Multer.File, expectedAmount: number): Promise<SlipVerifyResult> {
    const apiKey = process.env.SLIPOK_API_KEY;
    const branchId = process.env.SLIPOK_BRANCH_ID;
    if (!apiKey || !branchId) {
      throw new BadRequestException('ระบบตรวจสลิปยังไม่ได้ตั้งค่า (SLIPOK_API_KEY / SLIPOK_BRANCH_ID)');
    }

    const form = new FormData();
    form.append('files', new Blob([new Uint8Array(slip.buffer)], { type: slip.mimetype }), slip.originalname);
    form.append('amount', String(expectedAmount));
    form.append('log', 'true');

    let json: {
      success?: boolean;
      message?: string;
      data?: { transRef?: string; amount?: number; receiver?: { displayName?: string } };
    };
    try {
      const res = await fetch(`https://api.slipok.com/api/line/apikey/${branchId}`, {
        method: 'POST',
        headers: { 'x-authorization': apiKey },
        body: form,
      });
      json = await res.json();
    } catch {
      throw new BadRequestException('ตรวจสลิปไม่สำเร็จ (เชื่อมต่อระบบตรวจสลิปไม่ได้) กรุณาลองใหม่');
    }

    if (!json?.success || !json.data) {
      throw new BadRequestException(json?.message ?? 'สลิปไม่ถูกต้องหรือถูกใช้ไปแล้ว');
    }

    const transRef = json.data.transRef;
    const amount = json.data.amount ?? 0;
    if (!transRef) throw new BadRequestException('อ่านเลขอ้างอิงจากสลิปไม่ได้');

    // ยอดในสลิปต้องไม่น้อยกว่ายอดที่ต้องจ่าย (กันโอนขาด)
    if (amount + 0.01 < expectedAmount) {
      throw new BadRequestException(`ยอดโอนในสลิป (฿${amount.toLocaleString()}) น้อยกว่ายอดที่ต้องชำระ`);
    }

    // ชื่อบัญชีผู้รับต้องตรงกับบัญชีกลาง (ถ้าตั้ง PAYMENT_RECEIVER_NAME ไว้) — กันแนบสลิปที่โอนไปบัญชีอื่น
    const receiverName = json.data.receiver?.displayName;
    const expectName = process.env.PAYMENT_RECEIVER_NAME?.trim();
    if (expectName && receiverName && !receiverName.includes(expectName)) {
      throw new BadRequestException('บัญชีผู้รับในสลิปไม่ตรงกับบัญชีรับเงินของระบบ');
    }

    return { transRef, amount, receiverName };
  }
}
