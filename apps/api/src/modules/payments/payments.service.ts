import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { calcPayout } from '@hopak/shared';
import { PrismaService } from '../../prisma.service';
import { XenditGateway } from './gateway/xendit.gateway';
import { UploadsService } from '../uploads/uploads.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { generateCheckInToken, checkInTokenExpiry } from '../bookings/bookings.service';

@Injectable()
export class PaymentsService {
  // เวลาถือห้องระหว่างชำระเงิน — เกินแล้วไม่จ่าย คืนห้อง+ยกเลิก booking
  private static readonly HOLD_MS = 10 * 60 * 1000;

  constructor(
    private prisma: PrismaService,
    private xendit: XenditGateway,
    private uploads: UploadsService,
    private notifications: NotificationsService,
    private realtime: RealtimeGateway,
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
        commission: p.commission, // คอมที่หัก (20% ของค่าห้องเท่านั้น) — โชว์ให้เจ้าของหอเห็นว่าโดนหักเท่าไหร่
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

  // สร้าง QR พร้อมเพย์ให้ผู้เช่าสแกนจ่าย — จ่ายบน booking ที่รอชำระ (PENDING) ได้ทันที ไม่ต้องรอเจ้าของหอ
  // สร้าง Payment สถานะ PENDING ค้างไว้ (ผูก gatewayChargeId) — เงินยังไม่เข้า จะ SETTLED ตอน Xendit ยืนยันผ่าน webhook
  async createCharge(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.tenantId !== userId) throw new ForbiddenException('ไม่ใช่การจองของคุณ');
    if (booking.status !== 'PENDING') throw new BadRequestException('ชำระเงินได้เฉพาะการจองที่รอชำระเงินเท่านั้น');

    const now = new Date();
    const deadline = new Date(now.getTime() + PaymentsService.HOLD_MS);

    // จองห้องชั่วคราว (hold) ระหว่างชำระเงิน — เฉพาะรายเดือน (รายวันกันจองซ้ำด้วย overlap ตอนสร้าง booking แล้ว)
    // ล็อกแบบ atomic ด้วย updateMany: สำเร็จเฉพาะห้องที่ว่าง + ยังไม่ถูก hold (หรือ hold หมดเวลา/เป็นของ booking นี้เอง)
    // count = 0 = มีคนอื่นกำลังจ่ายห้องนี้อยู่ → กันจ่ายซ้อน ใครกดจ่ายก่อนได้ก่อน
    if (booking.rentalType !== 'DAILY') {
      const lock = await this.prisma.room.updateMany({
        where: {
          id: booking.roomId,
          status: 'AVAILABLE',
          OR: [{ heldUntil: null }, { heldUntil: { lt: now } }, { heldByBookingId: bookingId }],
        },
        data: { heldUntil: deadline, heldByBookingId: bookingId },
      });
      // 409 Conflict — frontend แยกเคสนี้โชว์ "ห้องมีคนจองอยู่" + ปุ่มกลับไปเลือกห้อง (ไม่ใช่ error ธรรมดา)
      if (lock.count === 0) {
        throw new ConflictException('ห้องนี้มีผู้เช่ารายอื่นกำลังชำระเงินอยู่ กรุณาเลือกห้องอื่น');
      }
    }

    // ถ้ามี Payment ค้างอยู่แล้ว: SETTLED = จ่ายไปแล้ว (กันซ้ำ), PENDING = ออก QR ใหม่ทับของเดิม (QR เดิมอาจหมดอายุ)
    if (booking.payment) {
      if (booking.payment.status !== 'PENDING') throw new BadRequestException('การจองนี้ชำระเงินแล้ว');
      await this.prisma.payment.delete({ where: { id: booking.payment.id } });
    }

    const charge = await this.xendit.createQrCharge(booking.amount, bookingId);

    // ค่าคอมคิดจาก "ค่าห้อง" (roomPrice) เท่านั้น — มัดจำคืนเจ้าของหอเต็ม ไม่โดนหัก
    // อัตราต่างกันตามประเภทการเช่า: รายเดือน 20% · รายวัน 10% (รายวันไม่มีมัดจำ ฐาน = ยอดเต็ม)
    const commissionBase = booking.roomPrice;
    const split = calcPayout({
      amount: booking.amount,
      commissionBase,
      rentalType: booking.rentalType,
    });
    await this.prisma.payment.create({
      data: {
        bookingId,
        amount: booking.amount,
        commission: split.commission,
        chamberShare: split.chamberShare,
        platformShare: split.platformShare,
        ownerPayout: split.ownerPayout,
        method: 'xendit_promptpay',
        status: 'PENDING',
        gatewayChargeId: charge.chargeId,
      },
    });

    // เก็บเส้นตายไว้บน booking ด้วย — frontend ใช้ทำนับถอยหลัง, cron ใช้เช็คหมดเวลา
    await this.prisma.booking.update({ where: { id: bookingId }, data: { paymentDeadline: deadline } });

    return { chargeId: charge.chargeId, qrString: charge.qrString, amount: booking.amount, paymentDeadline: deadline };
  }

  // เรียกจาก webhook เมื่อ Xendit ยืนยันว่าเงินเข้าจริง — idempotent (Xendit ยิงซ้ำได้)
  async confirmByCharge(chargeId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { gatewayChargeId: chargeId } });
    if (!payment) return { ok: false };
    if (payment.status !== 'PENDING') return { ok: true }; // ยืนยันไปแล้ว — ไม่ทำซ้ำ

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'SETTLED', settledAt: new Date() },
    });
    await this.finalizePaid(payment.bookingId);
    return { ok: true };
  }

  // ดัน booking เป็น PAID + ออกโทเค็น/ใบเสร็จ + ตัดห้อง + แจ้งผู้เช่า/เจ้าของหอ — เรียกหลังเงินเข้ายืนยันแล้ว
  private async finalizePaid(bookingId: string) {
    const booking = await this.prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { room: { include: { dorm: true } } },
    });
    if (booking.status === 'PAID' || booking.status === 'COMPLETED') return; // กันทำซ้ำ

    // ออกโทเค็นเข้าพักตรงนี้ (ใบเสร็จเกิดพร้อมกัน) — เช็คของเดิมก่อน กันออกใหม่ทับของที่ผู้เช่าถืออยู่
    // เก็บ booking เต็มแถวไว้ emit (frontend เอาไป replace ทั้ง object — ส่งบางส่วนจะทำให้ field หาย crash)
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'PAID',
        paymentDeadline: null, // จ่ายแล้ว ไม่มีเส้นตายอีก
        ...(booking.checkInToken
          ? {}
          : {
              checkInToken: generateCheckInToken(),
              checkInTokenExpiresAt: checkInTokenExpiry(booking.checkInDate),
            }),
      },
    });

    // รายเดือน = ตัดห้อง OCCUPIED กันคนอื่นจอง + เคลียร์ hold ; รายวัน = คุมด้วย bookedRanges ห้ามตั้ง OCCUPIED
    if (booking.rentalType !== 'DAILY') {
      await this.prisma.room.update({
        where: { id: booking.roomId },
        data: { status: 'OCCUPIED', heldUntil: null, heldByBookingId: null },
      });
    }

    // แจ้งผู้เช่า: จ่ายสำเร็จ ใบเสร็จ+โทเค็นพร้อม
    this.realtime.emitToUser(booking.tenantId, 'booking:updated', updated);
    this.realtime.emitToRole('admin', 'booking:updated', updated);
    await this.notifications.create(
      booking.tenantId,
      'payment',
      'ชำระเงินสำเร็จ',
      `ชำระเงินยอด ฿${booking.amount.toLocaleString()} สำเร็จ — ใบเสร็จและโทเค็นยืนยันการเข้าพักพร้อมแล้ว`,
    );
    // แจ้งเจ้าของหอ: มีเงินเข้ามาแล้ว (ขั้นที่ 3 ตามดีไซน์) — ระบบทำอัตโนมัติ ไม่ต้องกดรับ
    this.realtime.emitToUser(booking.room.dorm.ownerId, 'booking:updated', updated);
    await this.notifications.create(
      booking.room.dorm.ownerId,
      'payment',
      'มีการชำระเงินเข้ามาแล้ว',
      `${booking.contactName} ชำระเงินค่าจอง ${booking.room.dorm.name} ยอด ฿${booking.amount.toLocaleString()} เรียบร้อย — เตรียมห้องรอรับผู้เช่าได้เลย`,
    );
  }

  // คืนห้องเมื่อหมดเวลาชำระเงิน (hold expire) — รันทุก 1 นาที
  // ห้องที่ hold หมดเวลา: ยกเลิก booking ที่ยังไม่จ่าย + ลบ QR/payment ค้าง + ปล่อยห้องคืน AVAILABLE
  @Cron(CronExpression.EVERY_MINUTE)
  async releaseExpiredHolds() {
    const now = new Date();
    const expired = await this.prisma.room.findMany({
      where: { heldUntil: { lt: now }, heldByBookingId: { not: null } },
      select: { id: true, heldByBookingId: true },
    });

    for (const room of expired) {
      const bookingId = room.heldByBookingId;
      if (bookingId) {
        const booking = await this.prisma.booking.findUnique({ where: { id: bookingId }, include: { payment: true } });
        // ยกเลิกเฉพาะที่ยังไม่จ่าย (PENDING) — ถ้าจ่ายทันเส้นตายพอดี ปล่อยไว้ (finalizePaid เคลียร์ hold เอง)
        if (booking && booking.status === 'PENDING') {
          if (booking.payment?.status === 'PENDING') {
            await this.prisma.payment.delete({ where: { id: booking.payment.id } });
          }
          const cancelled = await this.prisma.booking.update({
            where: { id: bookingId },
            data: { status: 'CANCELLED', paymentDeadline: null },
          });
          this.realtime.emitToUser(booking.tenantId, 'booking:updated', cancelled);
          this.realtime.emitToRole('admin', 'booking:updated', cancelled);
          await this.notifications.create(
            booking.tenantId,
            'booking',
            'หมดเวลาชำระเงิน',
            'ไม่ได้ชำระเงินภายใน 10 นาที การจองถูกยกเลิกและคืนห้องแล้ว คุณสามารถจองใหม่ได้',
          );
        }
      }
      // ปล่อย hold คืน (ไม่ว่า booking จะเป็นอะไร) ให้คนอื่นจองห้องนี้ได้
      await this.prisma.room.update({ where: { id: room.id }, data: { heldUntil: null, heldByBookingId: null } });
    }
  }

  // dev เท่านั้น: จำลองเงินเข้าโดยไม่ต้องมี webhook สาธารณะ (ปิดใน production) — ให้เจ้าของการจองกดเทสได้
  async devConfirm(userId: string, bookingId: string) {
    if (process.env.NODE_ENV === 'production') throw new ForbiddenException('ปิดใช้งานใน production');
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId }, include: { payment: true } });
    if (!booking || booking.tenantId !== userId) throw new ForbiddenException('ไม่ใช่การจองของคุณ');
    if (!booking.payment?.gatewayChargeId) throw new BadRequestException('ยังไม่ได้สร้าง QR ชำระเงิน');
    return this.confirmByCharge(booking.payment.gatewayChargeId);
  }
}
