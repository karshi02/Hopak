import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { calcCommission, calcOwnerPayout, calcChamberShare, calcPlatformShare } from '@hopak/shared';
import { PrismaService } from '../../prisma.service';
import { PromptPayGateway } from './gateway/promptpay.gateway';
import { UploadsService } from '../uploads/uploads.service';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private gateway: PromptPayGateway,
    private uploads: UploadsService,
  ) {}

  // รายได้ payout ของเจ้าของหอ แยกตามสถานะ: SETTLED = รอโอน, TRANSFERRED = โอนแล้ว
  // ใช้บนแดชบอร์ดเจ้าของหอ — เมื่อแอดมินโอน (status→TRANSFERRED) ยอดจะย้ายจาก "รอโอน" ไป "โอนแล้ว" อัตโนมัติ
  async getOwnerIncome(ownerId: string) {
    const payments = await this.prisma.payment.findMany({
      where: {
        status: { in: ['SETTLED', 'TRANSFERRED'] },
        booking: { room: { dorm: { ownerId } } },
      },
      include: { booking: { include: { room: { include: { dorm: true } } } } },
      orderBy: { createdAt: 'desc' },
    });

    let received = 0;
    let pending = 0;
    const rows = payments.map((p) => {
      const transferred = p.status === 'TRANSFERRED';
      if (transferred) received += p.ownerPayout;
      else pending += p.ownerPayout;
      return {
        paymentId: p.id,
        bookingId: p.bookingId,
        ref: p.bookingId.slice(0, 8).toUpperCase(),
        tenantName: p.booking.contactName,
        dormName: p.booking.room.dorm.name,
        roomType: p.booking.room.type,
        roomPrice: p.booking.roomPrice,
        deposit: p.booking.deposit,
        ownerPayout: p.ownerPayout,
        status: transferred ? 'transferred' : 'pending',
        transferredAt: p.transferredAt,
        // สลิปที่แอดมินโอน (private) — แปลงเป็นลิงก์ชั่วคราวให้เจ้าของหอเปิดดูได้
        transferSlipUrl: p.transferSlipKey ? this.uploads.getPrivateUrl(p.transferSlipKey) : null,
      };
    });

    return { received, pending, rows };
  }

  // รายได้รายวัน — จัดกลุ่ม payment ตามวันที่ผู้เช่าชำระ (createdAt) แยกรับแล้ว/รอโอน + นับจำนวนจอง (รายวัน/เดือน)
  // ใช้บนหน้า /partner/income มุมมองรายวัน — ไม่ใส่ from/to = ทั้งหมด
  async getOwnerDailyIncome(ownerId: string, fromISO?: string, toISO?: string) {
    const createdAt: { gte?: Date; lte?: Date } = {};
    if (fromISO) createdAt.gte = new Date(fromISO);
    if (toISO) {
      const d = new Date(toISO);
      d.setHours(23, 59, 59, 999);
      createdAt.lte = d;
    }

    const payments = await this.prisma.payment.findMany({
      where: {
        status: { in: ['SETTLED', 'TRANSFERRED'] },
        booking: { room: { dorm: { ownerId } } },
        ...(fromISO || toISO ? { createdAt } : {}),
      },
      include: { booking: { select: { rentalType: true } } },
      orderBy: { createdAt: 'desc' },
    });

    type Day = { date: string; received: number; pending: number; count: number; daily: number; monthly: number };
    const map = new Map<string, Day>();
    for (const p of payments) {
      const day = p.createdAt.toISOString().slice(0, 10);
      const e: Day = map.get(day) ?? { date: day, received: 0, pending: 0, count: 0, daily: 0, monthly: 0 };
      if (p.status === 'TRANSFERRED') e.received += p.ownerPayout;
      else e.pending += p.ownerPayout;
      e.count += 1;
      if (p.booking.rentalType === 'DAILY') e.daily += 1;
      else e.monthly += 1;
      map.set(day, e);
    }

    const days = Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
    const totalReceived = days.reduce((s, d) => s + d.received, 0);
    const totalPending = days.reduce((s, d) => s + d.pending, 0);
    return { days, totalReceived, totalPending };
  }

  async pay(userId: string, bookingId: string, method: string, slip: Express.Multer.File) {
    if (!slip) throw new BadRequestException('กรุณาแนบสลิปโอนเงิน');

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    // เดิมไม่เช็คอะไรเลย ใครก็จ่าย/แนบสลิปทับ booking ของคนอื่นได้ + จ่าย booking ที่ยัง
    // PENDING ได้ (ข้ามการยืนยันของเจ้าของหอ) — คุม 3 อย่าง: เจ้าของ / สถานะ / จ่ายซ้ำ
    if (booking.tenantId !== userId) throw new ForbiddenException('ไม่ใช่การจองของคุณ');
    if (booking.status !== 'CONFIRMED') {
      throw new BadRequestException('ชำระเงินได้เฉพาะการจองที่เจ้าของหอยืนยันแล้วเท่านั้น');
    }
    if (booking.payment) throw new BadRequestException('การจองนี้มีการชำระเงินอยู่แล้ว');

    const result = await this.gateway.charge(booking.amount, method);

    // สลิปโอนเงินมีข้อมูลบัญชี/ธุรกรรมของลูกค้า — เก็บแบบ private เหมือนเอกสารยืนยันหอพัก ไม่มี URL ถาวรสาธารณะ
    const slipKey = `payments/${bookingId}/${Date.now()}-${slip.originalname}`;
    await this.uploads.upload(slipKey, slip.buffer, slip.mimetype, 'private');

    // ค่าคอมคิดจาก "ยอดรวม" (amount = ค่าห้อง+มัดจำ) — เจ้าของหอได้ 80% ของยอดรวม
    // roomPrice/deposit เก็บไว้แค่โชว์แยกในแดชบอร์ด ไม่ใช่ฐานคิดคอม
    return this.prisma.payment.create({
      data: {
        bookingId,
        amount: booking.amount,
        commission: calcCommission(booking.amount),
        chamberShare: calcChamberShare(booking.amount),
        platformShare: calcPlatformShare(booking.amount),
        ownerPayout: calcOwnerPayout(booking.amount),
        method,
        status: result.success ? 'PENDING' : 'PENDING',
        slipKey,
      },
    });
  }
}
