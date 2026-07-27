import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { UploadsService } from '../../uploads/uploads.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { MailService } from '../../mail/mail.service';

@Injectable()
export class FinanceService {
  constructor(
    private prisma: PrismaService,
    private uploads: UploadsService,
    private notifications: NotificationsService,
    private mail: MailService,
  ) {}

  private periodRange(year?: number, month?: number) {
    if (!year) return undefined;
    // month เป็น 1-12 (ฝั่ง frontend ส่งมาแบบนี้) — Date เดือนใน JS เริ่มที่ 0
    if (month) return { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) };
    return { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) };
  }

  async summary(year?: number, month?: number) {
    const createdAt = this.periodRange(year, month);
    const settled = await this.prisma.payment.findMany({
      where: { status: { in: ['SETTLED', 'TRANSFERRED'] }, ...(createdAt ? { createdAt } : {}) },
    });
    const pending = settled.filter((p) => p.status === 'SETTLED');
    const transferred = settled.filter((p) => p.status === 'TRANSFERRED');
    const totalCommission = settled.reduce((sum, p) => sum + p.commission, 0);
    const totalChamberShare = settled.reduce((sum, p) => sum + p.chamberShare, 0);
    const totalPlatformShare = settled.reduce((sum, p) => sum + p.platformShare, 0);
    const totalPayout = settled.reduce((sum, p) => sum + p.ownerPayout, 0);
    const totalReceived = settled.reduce((sum, p) => sum + p.amount, 0);
    const totalTransferred = transferred.reduce((sum, p) => sum + p.ownerPayout, 0);
    const totalPending = pending.reduce((sum, p) => sum + p.ownerPayout, 0);
    return {
      totalCommission,
      totalChamberShare,
      totalPlatformShare,
      totalPayout,
      totalReceived,
      totalTransferred,
      totalPending,
      count: settled.length,
    };
  }

  // ดูรายการย้อนหลังต่อรอบพร้อมสลิปโอนเงินของลูกค้า (สลิปเป็นไฟล์ private เซ็น URL ชั่วคราวทุกครั้งที่เรียก)
  async listDetailed(year?: number, month?: number) {
    const createdAt = this.periodRange(year, month);
    const payments = await this.prisma.payment.findMany({
      where: { status: { in: ['SETTLED', 'TRANSFERRED'] }, ...(createdAt ? { createdAt } : {}) },
      include: { booking: { include: { room: { include: { dorm: { include: { owner: true } } } } } } },
      orderBy: { createdAt: 'desc' },
    });

    return payments.map((p) => ({
      id: p.id,
      ownerName: p.booking.room.dorm.owner.name,
      dormName: p.booking.room.dorm.name,
      contactName: p.booking.contactName,
      amount: p.amount,
      commission: p.commission,
      chamberShare: p.chamberShare,
      platformShare: p.platformShare,
      ownerPayout: p.ownerPayout,
      status: p.status,
      createdAt: p.createdAt,
      slipUrl: p.slipKey ? this.uploads.getPrivateUrl(p.slipKey) : null,
      transferSlipUrl: p.transferSlipKey ? this.uploads.getPrivateUrl(p.transferSlipKey) : null,
    }));
  }

  // เดือน/ปีที่มีข้อมูลจริง — ใช้ทำ dropdown เลือกรอบย้อนหลังในหน้า admin
  async availablePeriods() {
    const payments = await this.prisma.payment.findMany({
      where: { status: { in: ['SETTLED', 'TRANSFERRED'] } },
      select: { createdAt: true },
    });
    const set = new Set(payments.map((p) => `${p.createdAt.getFullYear()}-${p.createdAt.getMonth() + 1}`));
    return Array.from(set)
      .map((key) => {
        const [year, month] = key.split('-').map(Number);
        return { year, month };
      })
      .sort((a, b) => b.year - a.year || b.month - a.month);
  }

  // ยอดที่ยังไม่ได้โอน (SETTLED) แยกตามเจ้าของหอ — พร้อมข้อมูลบัญชีรับเงิน ให้แอดมินเลือกโอนทีละคน
  async listPendingPayouts() {
    const payments = await this.prisma.payment.findMany({
      where: { status: 'SETTLED' },
      include: { booking: { include: { room: { include: { dorm: { include: { owner: true } } } } } } },
    });

    const byOwner = new Map<
      string,
      {
        ownerId: string;
        ownerName: string;
        bankName: string | null;
        bankAccountNumber: string | null;
        promptpayId: string | null;
        dormNames: Set<string>;
        totalPayout: number;
        paymentCount: number;
      }
    >();

    for (const p of payments) {
      const owner = p.booking.room.dorm.owner;
      const entry = byOwner.get(owner.id) ?? {
        ownerId: owner.id,
        ownerName: owner.name,
        bankName: owner.bankName,
        bankAccountNumber: owner.bankAccountNumber,
        promptpayId: owner.promptpayId,
        dormNames: new Set<string>(),
        totalPayout: 0,
        paymentCount: 0,
      };
      entry.dormNames.add(p.booking.room.dorm.name);
      entry.totalPayout += p.ownerPayout;
      entry.paymentCount += 1;
      byOwner.set(owner.id, entry);
    }

    return Array.from(byOwner.values()).map((e) => ({ ...e, dormNames: Array.from(e.dormNames) }));
  }

  // ประวัติการจ่ายทั้งหมดของเจ้าของหอคนเดียว (ทุกสถานะ ทุกช่วงเวลา) — ใช้ในหน้ารายละเอียดที่กดจากการ์ด "รอโอน"
  async getOwnerDetail(ownerId: string) {
    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: { id: true, name: true, email: true, phone: true, bankName: true, bankAccountNumber: true, promptpayId: true },
    });
    if (!owner) throw new NotFoundException('ไม่พบเจ้าของหอ');

    const payments = await this.prisma.payment.findMany({
      where: { status: { in: ['SETTLED', 'TRANSFERRED'] }, booking: { room: { dorm: { ownerId } } } },
      include: { booking: { include: { room: { include: { dorm: true } } } } },
      orderBy: { createdAt: 'desc' },
    });

    return {
      owner,
      payments: payments.map((p) => ({
        id: p.id,
        dormName: p.booking.room.dorm.name,
        contactName: p.booking.contactName,
        amount: p.amount,
        commission: p.commission,
        chamberShare: p.chamberShare,
        platformShare: p.platformShare,
        ownerPayout: p.ownerPayout,
        status: p.status,
        createdAt: p.createdAt,
        transferredAt: p.transferredAt,
        slipUrl: p.slipKey ? this.uploads.getPrivateUrl(p.slipKey) : null,
        transferSlipUrl: p.transferSlipKey ? this.uploads.getPrivateUrl(p.transferSlipKey) : null,
      })),
    };
  }

  // โอนยอด payout ให้เจ้าของหอคนเดียว ครบทุกรายการ SETTLED ของเขา พร้อมแนบสลิปที่แอดมินโอนจริง แล้วแจ้งเตือน+ส่งอีเมลเจ้าของหอ
  // confirmedAmount: ยอดที่แอดมินพิมพ์ยืนยันว่าโอนจริงเท่าไหร่ (ปกติ = ยอดที่ระบบคำนวณ แต่แก้ไขได้กรณีปัดเศษ/โอนเพิ่ม) ใช้แสดงในอีเมล/แจ้งเตือนเท่านั้น ไม่กระทบยอด ownerPayout ที่บันทึกไว้ต่อรายการจอง
  async transferToOwner(ownerId: string, slip: Express.Multer.File, confirmedAmount?: number) {
    if (!slip) throw new BadRequestException('กรุณาแนบสลิปการโอนเงิน');

    const payments = await this.prisma.payment.findMany({
      where: { status: 'SETTLED', booking: { room: { dorm: { ownerId } } } },
      include: { booking: { include: { room: { include: { dorm: true } } } } },
    });
    if (payments.length === 0) throw new BadRequestException('ไม่มียอดค้างโอนสำหรับเจ้าของหอนี้');

    const calculatedTotal = payments.reduce((sum, p) => sum + p.ownerPayout, 0);
    const transferAmount = confirmedAmount && confirmedAmount > 0 ? confirmedAmount : calculatedTotal;
    const dormName = payments[0].booking.room.dorm.name;

    const transferSlipKey = `payouts/${ownerId}/${Date.now()}-${slip.originalname}`;
    await this.uploads.upload(transferSlipKey, slip.buffer, slip.mimetype, 'private');

    const now = new Date();
    await this.prisma.payment.updateMany({
      where: { id: { in: payments.map((p) => p.id) } },
      data: { status: 'TRANSFERRED', transferSlipKey, transferredAt: now },
    });

    const owner = await this.prisma.user.findUnique({ where: { id: ownerId } });
    const dormsNote = payments.length > 1 ? ` (รวม ${payments.length} รายการจอง)` : '';
    const title = 'ได้รับโอนเงินจาก Hopak';
    const body = `โอนยอด payout ฿${transferAmount.toLocaleString()} เข้าบัญชีของคุณแล้ว (${dormName}${dormsNote})`;
    await this.notifications.create(ownerId, 'payout', title, body);

    if (owner?.email) {
      await this.mail.send(
        owner.email,
        'แจ้งโอนเงิน payout จาก Hopak',
        `<p>สวัสดีคุณ ${owner.name},</p>
         <p>ทีมงาน Hopak ได้โอนยอด payout <b>฿${transferAmount.toLocaleString()}</b> เข้าบัญชีของคุณเรียบร้อยแล้ว${dormsNote}</p>
         <p>แนบสลิปการโอนมาพร้อมอีเมลนี้ครับ</p>`,
        [{ filename: slip.originalname, content: slip.buffer, contentType: slip.mimetype }],
      );
    }

    return { transferred: payments.length, totalPayout: transferAmount };
  }
}
