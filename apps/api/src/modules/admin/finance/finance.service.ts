import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { UploadsService } from '../../uploads/uploads.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { MailService } from '../../mail/mail.service';
import { DisbursementGateway, resolveBankChannel } from '../../payments/gateway/disbursement.gateway';

@Injectable()
export class FinanceService {
  constructor(
    private prisma: PrismaService,
    private uploads: UploadsService,
    private notifications: NotificationsService,
    private mail: MailService,
    private disbursement: DisbursementGateway,
  ) {}

  // โอน payout ให้เจ้าของหอ "อัตโนมัติ" ผ่าน Xendit (แทนอัปสลิปมือ) — ยิงเงินออกไปบัญชีธนาคารเจ้าของหอจริง
  // ใช้บัญชีที่เจ้าของหอตั้งไว้ (bankName→channel, bankAccountNumber, bankAccountName)
  async transferForDormViaXendit(
    dormId: string,
    adminId: string,
    confirmedAmount?: number,
    note?: string,
    rentalType?: 'MONTHLY' | 'DAILY',
  ) {
    const dorm = await this.prisma.dorm.findUnique({ where: { id: dormId }, include: { owner: true } });
    if (!dorm) throw new NotFoundException('ไม่พบหอพัก');
    const owner = dorm.owner;

    const channel = resolveBankChannel(owner.bankName);
    if (!channel || !owner.bankAccountNumber || !owner.bankAccountName) {
      throw new BadRequestException('เจ้าของหอยังไม่ได้ตั้งบัญชีธนาคารรับเงิน (หรือธนาคารไม่รองรับการโอนอัตโนมัติ)');
    }

    // โอนแยกตามประเภทการเช่าได้ (รายเดือน/รายวัน คนละรอบ คนละยอด) — ไม่ระบุ = โอนรวมทั้งหมด
    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'SETTLED',
        booking: { room: { dormId }, ...(rentalType ? { rentalType } : {}) },
      },
    });
    const calculatedTotal = payments.reduce((sum, p) => sum + p.ownerPayout, 0);
    if (payments.length === 0 && !(confirmedAmount && confirmedAmount > 0)) {
      throw new BadRequestException('หอนี้ไม่มียอดค้างโอนในระบบ กรุณาระบุยอดที่จะโอนเอง');
    }
    const transferAmount = confirmedAmount && confirmedAmount > 0 ? confirmedAmount : calculatedTotal;
    const bonusAmount = Math.max(0, transferAmount - calculatedTotal);

    // ยิง Xendit โอนออกจริง — ได้ payoutId (disb-...) กลับมา
    const payoutRef = this.disbursement.freshReference(`dorm-${dormId}`);
    const payout = await this.disbursement.createPayout({
      channelCode: channel,
      accountNumber: owner.bankAccountNumber,
      accountHolderName: owner.bankAccountName,
      amount: transferAmount,
      referenceId: payoutRef,
      description: `Hoprak payout - ${dorm.name}${rentalType ? ` (${rentalType === 'DAILY' ? 'รายวัน' : 'รายเดือน'})` : ''}`,
    });

    const now = new Date();
    if (payments.length > 0) {
      // เก็บ payoutId/ref ไว้ด้วย — webhook ของ Xendit จะอ้างกลับมาด้วยค่าพวกนี้เวลาโอนสำเร็จ/ล้มเหลว
      // สถานะตอนนี้เป็นแค่ "ส่งคำสั่งโอนแล้ว" ยังไม่ใช่เงินถึงปลายทาง — รอ webhook ยืนยันอีกที
      await this.prisma.payment.updateMany({
        where: { id: { in: payments.map((p) => p.id) } },
        data: {
          status: 'TRANSFERRED',
          transferredAt: now,
          payoutId: payout.payoutId,
          payoutRef,
          payoutStatus: payout.status,
          payoutFailedReason: null,
        },
      });
    }

    await this.prisma.approvalLog.create({
      data: {
        entityType: 'PAYOUT',
        entityId: dormId,
        action: 'XENDIT_TRANSFER',
        adminId,
        snapshot: {
          dormId,
          dormName: dorm.name,
          ownerId: dorm.ownerId,
          amount: transferAmount,
          baseAmount: calculatedTotal,
          rentalType: rentalType ?? 'ALL',
          bonusAmount,
          note: note ?? null,
          linkedPaymentIds: payments.map((p) => p.id),
          payoutId: payout.payoutId,
          payoutStatus: payout.status,
          channel,
        },
        note: `โอนอัตโนมัติผ่าน Xendit (${payout.status})`,
      },
    });

    await this.notifications.create(
      dorm.ownerId,
      'payout',
      'ได้รับโอนเงินจาก Hoprak',
      `โอนเงิน ฿${transferAmount.toLocaleString()} เข้าบัญชี ${owner.bankName} ${owner.bankAccountNumber} แล้ว (หอ ${dorm.name})`,
    );

    return { payoutId: payout.payoutId, status: payout.status, amount: transferAmount };
  }

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

    // ยอดคงเหลือในบัญชีกลางจริง — ไม่ผูกกับ filter ช่วงเวลาที่เลือก (บัญชีจริงไม่มีทาง "รีเซ็ต" ทุกเดือน)
    // = เงินเข้าทั้งหมดตลอดเวลา - เงินที่โอนออกให้เจ้าของหอไปแล้วทั้งหมด (นับรวม transfer แบบ ad-hoc ที่ไม่ผูก payment ด้วย
    // โดยอ่านจาก ApprovalLog ที่บันทึกไว้ทุกครั้งที่กดโอนเงิน ไม่ใช่แค่นับจาก Payment.status=TRANSFERRED)
    const [allTimeReceived, transferLogs] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { status: { in: ['SETTLED', 'TRANSFERRED'] } },
        _sum: { amount: true },
      }),
      this.prisma.approvalLog.findMany({ where: { entityType: 'PAYOUT' }, select: { snapshot: true } }),
    ]);
    const totalTransferredOutAllTime = transferLogs.reduce((sum, log) => {
      const snap = log.snapshot as { amount?: number } | null;
      return sum + (snap?.amount ?? 0);
    }, 0);
    const centralBalance = (allTimeReceived._sum.amount ?? 0) - totalTransferredOutAllTime;

    return {
      totalCommission,
      totalChamberShare,
      totalPlatformShare,
      totalPayout,
      totalReceived,
      totalTransferred,
      totalPending,
      centralBalance,
      count: settled.length,
    };
  }

  /**
   * รายได้จากหอพัก "รายวัน" เท่านั้น แยกตามหอ — คนละส่วนกับรายเดือน ไม่รวมกัน
   * นับเฉพาะ booking.rentalType = DAILY ที่จ่ายเงินแล้ว (SETTLED/TRANSFERRED)
   */
  async dailySummary(year?: number, month?: number) {
    const createdAt = this.periodRange(year, month);
    const payments = await this.prisma.payment.findMany({
      where: {
        status: { in: ['SETTLED', 'TRANSFERRED'] },
        booking: { rentalType: 'DAILY' },
        ...(createdAt ? { createdAt } : {}),
      },
      include: { booking: { include: { room: { include: { dorm: { include: { owner: true } } } } } } },
      orderBy: { createdAt: 'desc' },
    });

    const byDorm = new Map<
      string,
      {
        dormId: string;
        dormName: string;
        ownerId: string;
        ownerName: string;
        bookings: number;
        nights: number;
        gross: number;
        commission: number;
        ownerPayout: number;
        transferred: number;
        pending: number;
      }
    >();

    for (const p of payments) {
      const dorm = p.booking.room.dorm;
      const row = byDorm.get(dorm.id) ?? {
        dormId: dorm.id,
        dormName: dorm.name,
        ownerId: dorm.owner.id,
        ownerName: dorm.owner.name,
        bookings: 0,
        nights: 0,
        gross: 0,
        commission: 0,
        ownerPayout: 0,
        transferred: 0,
        pending: 0,
      };
      row.bookings += 1;
      row.nights += p.booking.nights ?? 0;
      row.gross += p.amount;
      row.commission += p.commission;
      row.ownerPayout += p.ownerPayout;
      if (p.status === 'TRANSFERRED') row.transferred += p.ownerPayout;
      else row.pending += p.ownerPayout;
      byDorm.set(dorm.id, row);
    }

    const rows = Array.from(byDorm.values()).sort((a, b) => b.gross - a.gross);
    const totals = rows.reduce(
      (acc, r) => ({
        bookings: acc.bookings + r.bookings,
        nights: acc.nights + r.nights,
        gross: acc.gross + r.gross,
        commission: acc.commission + r.commission,
        ownerPayout: acc.ownerPayout + r.ownerPayout,
        transferred: acc.transferred + r.transferred,
        pending: acc.pending + r.pending,
      }),
      { bookings: 0, nights: 0, gross: 0, commission: 0, ownerPayout: 0, transferred: 0, pending: 0 },
    );
    // ราคาเฉลี่ยต่อคืนทั้งระบบ (ADR) — ใช้ค่าห้องอย่างเดียว ไม่รวมมัดจำ (รายวันไม่เก็บมัดจำอยู่แล้ว)
    const roomRentTotal = payments.reduce((sum, p) => sum + p.booking.roomPrice, 0);
    const adr = totals.nights > 0 ? roomRentTotal / totals.nights : 0;

    return { rows, totals, adr };
  }

  /**
   * สรุปภาพรวมทั้งปี — ยอดรับรวม, ค่าคอม 20%, เงินโอนออก, ยอดคงเหลือ,
   * สมาชิกที่สมัครเข้ามา, และรายชื่อเจ้าของหอ (ยอดโอนแล้ว/รอโอน/สถานะระงับ)
   */
  async yearlySummary(year?: number) {
    const y = year ?? new Date().getFullYear();
    const yearRange = { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) };

    const [payments, transferLogs, users, dorms, allPaymentYears] = await Promise.all([
      this.prisma.payment.findMany({
        where: { status: { in: ['SETTLED', 'TRANSFERRED'] }, createdAt: yearRange },
        include: { booking: { include: { room: { include: { dorm: { include: { owner: true } } } } } } },
      }),
      this.prisma.approvalLog.findMany({
        where: { entityType: 'PAYOUT', createdAt: yearRange },
        select: { snapshot: true },
      }),
      this.prisma.user.findMany({ select: { id: true, role: true, suspended: true, createdAt: true } }),
      this.prisma.dorm.findMany({ select: { id: true, ownerId: true, status: true } }),
      this.prisma.payment.findMany({
        where: { status: { in: ['SETTLED', 'TRANSFERRED'] } },
        select: { createdAt: true },
      }),
    ]);

    // ยอดต่อเดือนของปีนี้
    const months = Array.from({ length: 12 }, (_, m) => ({
      month: m + 1,
      gross: 0,
      commission: 0,
      ownerPayout: 0,
      bookings: 0,
    }));
    for (const p of payments) {
      const row = months[p.createdAt.getMonth()];
      row.gross += p.amount;
      row.commission += p.commission;
      row.ownerPayout += p.ownerPayout;
      row.bookings += 1;
    }

    const transferredOut = transferLogs.reduce((sum, log) => {
      const snap = log.snapshot as { amount?: number } | null;
      return sum + (snap?.amount ?? 0);
    }, 0);

    const totals = {
      gross: payments.reduce((s, p) => s + p.amount, 0),
      commission: payments.reduce((s, p) => s + p.commission, 0),
      ownerPayout: payments.reduce((s, p) => s + p.ownerPayout, 0),
      bookings: payments.length,
      transferredOut,
      // คงเหลือในบัญชีกลางของ "ปีนี้" = เงินเข้าปีนี้ − เงินโอนออกปีนี้
      balance: payments.reduce((s, p) => s + p.amount, 0) - transferredOut,
    };

    // สมาชิก
    const members = {
      total: users.length,
      newThisYear: users.filter((u) => u.createdAt >= yearRange.gte && u.createdAt < yearRange.lt).length,
      tenants: users.filter((u) => u.role === 'TENANT').length,
      owners: users.filter((u) => u.role === 'OWNER').length,
      admins: users.filter((u) => u.role === 'ADMIN').length,
      suspended: users.filter((u) => u.suspended).length,
    };

    // รายชื่อเจ้าของหอ + ยอดโอน/รอโอนของปีนี้
    const ownerMap = new Map<
      string,
      {
        ownerId: string;
        name: string;
        email: string | null;
        phone: string | null;
        suspended: boolean;
        dormCount: number;
        gross: number;
        payout: number;
        transferred: number;
        pending: number;
      }
    >();
    for (const p of payments) {
      const owner = p.booking.room.dorm.owner;
      const row = ownerMap.get(owner.id) ?? {
        ownerId: owner.id,
        name: owner.name,
        email: owner.email ?? null,
        phone: owner.phone ?? null,
        suspended: owner.suspended,
        dormCount: dorms.filter((d) => d.ownerId === owner.id).length,
        gross: 0,
        payout: 0,
        transferred: 0,
        pending: 0,
      };
      row.gross += p.amount;
      row.payout += p.ownerPayout;
      if (p.status === 'TRANSFERRED') row.transferred += p.ownerPayout;
      else row.pending += p.ownerPayout;
      ownerMap.set(owner.id, row);
    }

    const years = Array.from(new Set(allPaymentYears.map((p) => p.createdAt.getFullYear()))).sort((a, b) => b - a);

    return {
      year: y,
      years: years.length > 0 ? years : [y],
      months,
      totals,
      members,
      owners: [...ownerMap.values()].sort((a, b) => b.gross - a.gross),
      dorms: {
        total: dorms.length,
        approved: dorms.filter((d) => d.status === 'APPROVED').length,
        suspended: dorms.filter((d) => d.status === 'SUSPENDED').length,
        rejected: dorms.filter((d) => d.status === 'REJECTED').length,
      },
    };
  }

  // ประวัติการโอนเงินทั้งหมด (ทุกครั้งที่แอดมินกดโอน ไม่ว่าจะผูกกับ payment หรือ ad-hoc) — ใครโอน โอนให้ใคร วันเวลา ยอดเท่าไหร่
  async transferHistory() {
    const logs = await this.prisma.approvalLog.findMany({
      where: { entityType: 'PAYOUT' },
      include: { admin: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return logs.map((log) => {
      const snap = (log.snapshot ?? {}) as {
        dormId?: string;
        dormName?: string;
        ownerId?: string;
        amount?: number;
        baseAmount?: number;
        bonusAmount?: number;
        note?: string | null;
        transferSlipKey?: string;
      };
      return {
        id: log.id,
        dormName: snap.dormName ?? '—',
        amount: snap.amount ?? 0,
        baseAmount: snap.baseAmount ?? 0,
        bonusAmount: snap.bonusAmount ?? 0,
        note: snap.note ?? null,
        adminName: log.admin.name,
        slipUrl: snap.transferSlipKey ? this.uploads.getPrivateUrl(snap.transferSlipKey) : null,
        createdAt: log.createdAt,
      };
    });
  }

  // ดูรายการย้อนหลังต่อรอบพร้อมสลิปโอนเงินของลูกค้า (สลิปเป็นไฟล์ private เซ็น URL ชั่วคราวทุกครั้งที่เรียก)
  async listDetailed(year?: number, month?: number) {
    const createdAt = this.periodRange(year, month);
    // รวม PENDING ด้วย — แอดมินต้องเห็นรายการรอเคลียร์บิลในตารางนี้ถึงจะกดเคลียร์ได้
    const payments = await this.prisma.payment.findMany({
      where: { status: { in: ['PENDING', 'SETTLED', 'TRANSFERRED'] }, ...(createdAt ? { createdAt } : {}) },
      include: { booking: { include: { room: { include: { dorm: { include: { owner: true } } } } } } },
      orderBy: { createdAt: 'desc' },
    });

    return payments.map((p) => ({
      id: p.id,
      dormId: p.booking.room.dorm.id,
      ownerId: p.booking.room.dorm.owner.id,
      ownerName: p.booking.room.dorm.owner.name,
      dormName: p.booking.room.dorm.name,
      contactName: p.booking.contactName,
      rentalType: p.booking.rentalType,
      method: p.method,
      amount: p.amount,
      roomPrice: p.booking.roomPrice,
      deposit: p.booking.deposit,
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

  // แสดงหอที่อนุมัติแล้วทั้งหมด (เลือกดูได้ทุกหอ ไม่ใช่แค่หอที่มียอดค้างโอน) พร้อมยอดค้างโอนจริง
  // (SETTLED เท่านั้น — ถ้าไม่มียอด totalPayout เป็น 0 ปุ่มโอนฝั่ง frontend ต้อง disable เพราะ
  // การโอนต้องผูกกับ payment จริงเสมอ ห้ามโอนแบบไม่มีที่มา)
  /**
   * ยอดค้างโอนแยกตามประเภทการเช่า + ส่วนแบ่งแพลตฟอร์มของแต่ละประเภท
   * รายเดือนหักคอม 20% จากค่าห้อง · รายวันหัก 10% จากยอดเต็ม → ต้องดูแยกกัน ไม่ใช่ยอดรวมก้อนเดียว
   */
  async payoutBreakdown(dormId?: string) {
    const payments = await this.prisma.payment.findMany({
      where: {
        status: { in: ['SETTLED', 'TRANSFERRED'] },
        ...(dormId ? { booking: { room: { dormId } } } : {}),
      },
      include: { booking: { include: { room: { include: { dorm: { include: { owner: true } } } } } } },
    });

    type Bucket = { gross: number; commission: number; ownerPayout: number; pending: number; transferred: number; count: number };
    const empty = (): Bucket => ({ gross: 0, commission: 0, ownerPayout: 0, pending: 0, transferred: 0, count: 0 });

    const byDorm = new Map<
      string,
      { dormId: string; dormName: string; ownerId: string; ownerName: string; monthly: Bucket; daily: Bucket }
    >();

    for (const p of payments) {
      const dorm = p.booking.room.dorm;
      const row =
        byDorm.get(dorm.id) ?? {
          dormId: dorm.id,
          dormName: dorm.name,
          ownerId: dorm.owner.id,
          ownerName: dorm.owner.name,
          monthly: empty(),
          daily: empty(),
        };
      const bucket = p.booking.rentalType === 'DAILY' ? row.daily : row.monthly;
      bucket.gross += p.amount;
      bucket.commission += p.commission;
      bucket.ownerPayout += p.ownerPayout;
      bucket.count += 1;
      if (p.status === 'TRANSFERRED') bucket.transferred += p.ownerPayout;
      else bucket.pending += p.ownerPayout;
      byDorm.set(dorm.id, row);
    }

    const rows = [...byDorm.values()].sort(
      (a, b) => b.monthly.gross + b.daily.gross - (a.monthly.gross + a.daily.gross),
    );
    const sum = (pick: (r: (typeof rows)[number]) => Bucket) =>
      rows.reduce(
        (acc, r) => {
          const b = pick(r);
          return {
            gross: acc.gross + b.gross,
            commission: acc.commission + b.commission,
            ownerPayout: acc.ownerPayout + b.ownerPayout,
            pending: acc.pending + b.pending,
            transferred: acc.transferred + b.transferred,
            count: acc.count + b.count,
          };
        },
        empty(),
      );

    return { rows, totals: { monthly: sum((r) => r.monthly), daily: sum((r) => r.daily) } };
  }

  /**
   * รายได้แพลตฟอร์ม (ค่าคอม) แยกรายเดือน/รายวัน ตามช่วงเวลา
   * period = 'day' (30 วันล่าสุด) · 'month' (12 เดือนของปี) · 'year' (ทุกปีที่มีข้อมูล)
   */
  async revenueBreakdown(period: 'day' | 'month' | 'year' = 'month', year?: number) {
    const y = year ?? new Date().getFullYear();
    const since = period === 'day' ? new Date(Date.now() - 29 * 24 * 60 * 60 * 1000) : undefined;

    const payments = await this.prisma.payment.findMany({
      where: {
        status: { in: ['SETTLED', 'TRANSFERRED'] },
        ...(period === 'month' ? { createdAt: { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) } } : {}),
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      include: { booking: { select: { rentalType: true } } },
    });

    const keyOf = (d: Date) => {
      if (period === 'day') return d.toISOString().slice(0, 10);
      if (period === 'month') return String(d.getMonth() + 1);
      return String(d.getFullYear());
    };

    const map = new Map<
      string,
      { key: string; monthlyCommission: number; dailyCommission: number; monthlyGross: number; dailyGross: number }
    >();
    for (const p of payments) {
      const key = keyOf(p.createdAt);
      const row =
        map.get(key) ?? { key, monthlyCommission: 0, dailyCommission: 0, monthlyGross: 0, dailyGross: 0 };
      if (p.booking.rentalType === 'DAILY') {
        row.dailyCommission += p.commission;
        row.dailyGross += p.amount;
      } else {
        row.monthlyCommission += p.commission;
        row.monthlyGross += p.amount;
      }
      map.set(key, row);
    }

    const rows = [...map.values()].sort((a, b) =>
      period === 'month' ? Number(a.key) - Number(b.key) : a.key.localeCompare(b.key),
    );
    const totals = rows.reduce(
      (acc, r) => ({
        monthlyCommission: acc.monthlyCommission + r.monthlyCommission,
        dailyCommission: acc.dailyCommission + r.dailyCommission,
        monthlyGross: acc.monthlyGross + r.monthlyGross,
        dailyGross: acc.dailyGross + r.dailyGross,
      }),
      { monthlyCommission: 0, dailyCommission: 0, monthlyGross: 0, dailyGross: 0 },
    );

    return { period, year: y, rows, totals };
  }

  async listPendingPayouts() {
    const [dorms, payments] = await Promise.all([
      this.prisma.dorm.findMany({
        where: { status: 'APPROVED' },
        include: { owner: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.payment.findMany({
        where: { status: 'SETTLED' },
        include: { booking: { include: { room: true } } },
      }),
    ]);

    const totalsByDorm = new Map<string, { totalPayout: number; paymentCount: number }>();
    for (const p of payments) {
      const dormId = p.booking.room.dormId;
      const entry = totalsByDorm.get(dormId) ?? { totalPayout: 0, paymentCount: 0 };
      entry.totalPayout += p.ownerPayout;
      entry.paymentCount += 1;
      totalsByDorm.set(dormId, entry);
    }

    return dorms.map((dorm) => {
      const totals = totalsByDorm.get(dorm.id) ?? { totalPayout: 0, paymentCount: 0 };
      return {
        dormId: dorm.id,
        dormName: dorm.name,
        ownerId: dorm.owner.id,
        ownerName: dorm.owner.name,
        ownerPhone: dorm.owner.phone,
        bankName: dorm.owner.bankName,
        bankAccountName: dorm.owner.bankAccountName,
        bankAccountNumber: dorm.owner.bankAccountNumber,
        promptpayId: dorm.owner.promptpayId,
        totalPayout: totals.totalPayout,
        paymentCount: totals.paymentCount,
      };
    });
  }

  // ประวัติการจ่ายทั้งหมดของเจ้าของหอคนเดียว (ทุกสถานะ ทุกช่วงเวลา) — ใช้ในหน้ารายละเอียดที่กดจากการ์ด "รอโอน"
  async getOwnerDetail(ownerId: string) {
    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        bankName: true,
        bankAccountName: true,
        bankAccountNumber: true,
        promptpayId: true,
      },
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
        roomPrice: p.booking.roomPrice,
        deposit: p.booking.deposit,
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

  // โอนยอด payout ให้เจ้าของหอทีละหอ — โอนได้ทุกหอทันทีแม้ไม่มียอด SETTLED ในระบบเลย
  // (แอดมินพิมพ์ยอดเองอิสระ ไม่ผูกกับ payment ใดๆ ก็ได้ เผื่อโอนพิเศษ/โบนัส/ปรับยอดเอง)
  // ถ้ามี payment SETTLED ค้างอยู่จริง จะ mark เป็น TRANSFERRED ให้ด้วยตามปกติ
  // ทุกครั้งที่โอน (ไม่ว่าจะผูกกับ payment หรือไม่) บันทึกลง ApprovalLog เก็บ audit trail ไว้เสมอ
  async transferForDorm(
    dormId: string,
    adminId: string,
    slip: Express.Multer.File,
    confirmedAmount?: number,
    note?: string,
  ) {
    if (!slip) throw new BadRequestException('กรุณาแนบสลิปการโอนเงิน');

    const dorm = await this.prisma.dorm.findUnique({ where: { id: dormId }, include: { owner: true } });
    if (!dorm) throw new NotFoundException('ไม่พบหอพัก');

    const payments = await this.prisma.payment.findMany({
      where: { status: 'SETTLED', booking: { room: { dormId } } },
    });
    const calculatedTotal = payments.reduce((sum, p) => sum + p.ownerPayout, 0);

    if (payments.length === 0 && !(confirmedAmount && confirmedAmount > 0)) {
      throw new BadRequestException('หอนี้ไม่มียอดค้างโอนในระบบ กรุณาระบุยอดที่จะโอนเอง');
    }
    const transferAmount = confirmedAmount && confirmedAmount > 0 ? confirmedAmount : calculatedTotal;
    const bonusAmount = Math.max(0, transferAmount - calculatedTotal);
    const dormName = dorm.name;
    const ownerId = dorm.ownerId;

    const transferSlipKey = `payouts/${dormId}/${Date.now()}-${slip.originalname}`;
    await this.uploads.upload(transferSlipKey, slip.buffer, slip.mimetype, 'private');

    const now = new Date();
    if (payments.length > 0) {
      await this.prisma.payment.updateMany({
        where: { id: { in: payments.map((p) => p.id) } },
        data: { status: 'TRANSFERRED', transferSlipKey, transferredAt: now },
      });
    }

    await this.prisma.approvalLog.create({
      data: {
        entityType: 'PAYOUT',
        entityId: dormId,
        action: 'MANUAL_TRANSFER',
        adminId,
        snapshot: {
          dormId,
          dormName,
          ownerId,
          amount: transferAmount,
          baseAmount: calculatedTotal,
          bonusAmount,
          note: note ?? null,
          linkedPaymentIds: payments.map((p) => p.id),
          transferSlipKey,
        },
        note: payments.length === 0 ? 'โอนแบบไม่ผูกกับ payment ในระบบ (แอดมินระบุยอดเอง)' : null,
      },
    });

    const owner = dorm.owner;
    const dormsNote = payments.length > 1 ? ` (รวม ${payments.length} รายการจอง)` : '';
    const breakdownLines = [
      `ยอดรวมทั้งหมดที่โอน: ฿${transferAmount.toLocaleString()}`,
      bonusAmount > 0 ? `  (ยอดปกติ ฿${calculatedTotal.toLocaleString()} + โบนัสเพิ่มเติม ฿${bonusAmount.toLocaleString()})` : null,
    ].filter(Boolean);
    const title = 'ได้รับโอนเงินจาก Hoprak';
    const body = [...breakdownLines, `หอ: ${dormName}${dormsNote}`, note ? `หมายเหตุ: ${note}` : null]
      .filter(Boolean)
      .join(' — ');
    await this.notifications.create(ownerId, 'payout', title, body, transferSlipKey);

    if (owner?.email) {
      await this.mail.send(
        owner.email,
        'แจ้งโอนเงิน payout จาก Hoprak',
        `<p>สวัสดีคุณ ${owner.name},</p>
         <p>ทีมงาน Hoprak ได้โอนเงินเข้าบัญชีของคุณเรียบร้อยแล้ว (${dormName}${dormsNote})</p>
         <p><b>ยอดรวมทั้งหมดที่โอน: ฿${transferAmount.toLocaleString()}</b></p>
         ${
           bonusAmount > 0
             ? `<p>แยกเป็น: ยอดปกติ ฿${calculatedTotal.toLocaleString()} + โบนัสเพิ่มเติม ฿${bonusAmount.toLocaleString()}</p>`
             : ''
         }
         ${note ? `<p>หมายเหตุจากแอดมิน: ${note}</p>` : ''}
         <p>แนบสลิปการโอนมาพร้อมอีเมลนี้ครับ</p>`,
        [{ filename: slip.originalname, content: slip.buffer, contentType: slip.mimetype }],
      );
    }

    return { transferred: payments.length, totalPayout: transferAmount, bonusAmount };
  }
}
