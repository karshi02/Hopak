import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

export interface PayoutResult {
  payoutId: string; // id ฝั่ง Xendit (disb-...)
  status: string; // ACCEPTED / PENDING / ...
}

// map ชื่อธนาคาร (ที่เจ้าของหอกรอก) → channel_code ของ Xendit (payouts)
// ครอบคลุมธนาคารหลักไทย — จับจากคีย์เวิร์ดในชื่อ (ไทย/อังกฤษ) ไม่สนตัวพิมพ์
const BANK_CHANNELS: { code: string; match: string[] }[] = [
  { code: 'TH_KKB', match: ['กสิกร', 'kasikorn', 'kbank'] },
  { code: 'TH_SCB', match: ['ไทยพาณิชย์', 'siam commercial', 'scb'] },
  { code: 'TH_KTB', match: ['กรุงไทย', 'krung thai', 'ktb'] },
  { code: 'TH_BBL', match: ['กรุงเทพ', 'bangkok bank', 'bbl'] },
  { code: 'TH_BAY', match: ['กรุงศรี', 'ayudhya', 'krungsri', 'bay'] },
  { code: 'TH_TMB', match: ['ทหารไทยธนชาต', 'ttb', 'tmb', 'thanachart'] },
  { code: 'TH_GSB', match: ['ออมสิน', 'government savings', 'gsb'] },
  { code: 'TH_BAA', match: ['ธ.ก.ส', 'เกษตร', 'baac'] },
];

export function resolveBankChannel(bankName: string | null | undefined): string | null {
  if (!bankName) return null;
  const n = bankName.toLowerCase();
  return BANK_CHANNELS.find((b) => b.match.some((m) => n.includes(m.toLowerCase())))?.code ?? null;
}

// โอนเงินออกไปบัญชีธนาคารจริงผ่าน Xendit Payouts (v2/payouts)
// เอกสาร: https://developer.xendit.co/api-reference/#create-payout
@Injectable()
export class DisbursementGateway {
  private authHeader() {
    const key = process.env.XENDIT_SECRET_KEY;
    if (!key) throw new BadRequestException('ระบบโอนเงินยังไม่ได้ตั้งค่า (XENDIT_SECRET_KEY)');
    return `Basic ${Buffer.from(`${key}:`).toString('base64')}`;
  }

  async createPayout(params: {
    channelCode: string;
    accountNumber: string;
    accountHolderName: string;
    amount: number;
    referenceId: string;
    description?: string;
  }): Promise<PayoutResult> {
    let res: Response;
    try {
      res = await fetch('https://api.xendit.co/v2/payouts', {
        method: 'POST',
        headers: {
          Authorization: this.authHeader(),
          'Content-Type': 'application/json',
          // idempotency กันโอนซ้ำถ้ายิงซ้ำ (network retry) — ต่อ referenceId
          'Idempotency-key': `payout-${params.referenceId}`,
        },
        body: JSON.stringify({
          reference_id: params.referenceId,
          channel_code: params.channelCode,
          channel_properties: {
            account_number: params.accountNumber,
            account_holder_name: params.accountHolderName,
          },
          amount: params.amount,
          currency: 'THB',
          description: params.description ?? 'Hoprak payout',
        }),
      });
    } catch {
      throw new BadRequestException('เชื่อมต่อระบบโอนเงินไม่ได้ กรุณาลองใหม่');
    }

    const json = (await res.json().catch(() => ({}))) as {
      id?: string;
      status?: string;
      message?: string;
      error_code?: string;
    };
    if (!res.ok || !json.id) {
      throw new BadRequestException(json.message ?? 'โอนเงินไม่สำเร็จ');
    }
    return { payoutId: json.id, status: json.status ?? 'ACCEPTED' };
  }

  // idempotency key ต้อง unique ต่อการโอน — ใส่ suffix สุ่มเมื่อจงใจโอนซ้ำ (ไม่ใช่ retry)
  freshReference(prefix: string) {
    return `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}`;
  }
}
