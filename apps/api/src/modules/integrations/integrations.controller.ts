import { BadRequestException, Controller, Get, Headers, NotFoundException, Query } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

/**
 * ยอดชำระเงินสำหรับระบบรวมยอดของกลุ่ม (LS Hub) — อ่านอย่างเดียว
 *
 *   GET /integrations/payments?since=<ISO>&until=<ISO>
 *   Authorization: Bearer $LSHUB_API_KEY
 *
 * ไม่ตั้ง LSHUB_API_KEY = ปิดไว้ (404) — ไม่มีใครยิงจากข้างนอกได้
 * ไม่ส่ง since = 90 วันย้อนหลัง · ช่วงยาวสุด 366 วัน · ตอบไม่เกิน 5,000 รายการ
 *
 * รูปแบบตรงกับ TaladNads (สัญญาเดียวกัน):
 *   { source, generatedAt, items: [{ externalRef, amount, occurredAt, status: 'PAID'|'VOID', unitCode, unitName, meta }] }
 *   - amount = เงินที่ผู้เช่าจ่ายทั้งก้อน (ปัด 2 ตำแหน่งเป็น string เพราะ DB เก็บ Float)
 *   - SETTLED และ TRANSFERRED นับเป็นจ่ายแล้วทั้งคู่ (TRANSFERRED = โอนให้เจ้าของหอแล้ว) · เวลาใช้ settledAt
 *   - ส่วนแบ่ง (commission / platformShare / chamberShare / ownerPayout) อยู่ใน meta ให้ปลายทางเลือกสูตรเอง
 */
@Controller('integrations')
export class IntegrationsController {
  constructor(private prisma: PrismaService) {}

  @Get('payments')
  async payments(@Headers('authorization') auth: string | undefined, @Query('since') sinceQ?: string, @Query('until') untilQ?: string) {
    const key = process.env.LSHUB_API_KEY;
    if (!key || (auth ?? '') !== `Bearer ${key}`) throw new NotFoundException();

    const now = new Date();
    const since = parseDate(sinceQ) ?? new Date(now.getTime() - 90 * 86400e3);
    const until = parseDate(untilQ) ?? now;
    if (until <= since || until.getTime() - since.getTime() > 366 * 86400e3) {
      throw new BadRequestException('ช่วงเวลาไม่ถูกต้อง (until > since และไม่เกิน 366 วัน)');
    }

    const rows = await this.prisma.payment.findMany({
      where: { status: { in: ['SETTLED', 'TRANSFERRED'] }, settledAt: { gte: since, lt: until } },
      orderBy: { settledAt: 'asc' },
      take: 5000,
      select: {
        id: true,
        amount: true,
        commission: true,
        chamberShare: true,
        platformShare: true,
        ownerPayout: true,
        method: true,
        status: true,
        settledAt: true,
        booking: {
          select: {
            id: true,
            rentalType: true,
            checkInDate: true,
            nights: true,
            room: { select: { id: true, name: true, dorm: { select: { id: true, name: true, province: true } } } },
          },
        },
      },
    });

    const items = rows.map((p) => ({
      externalRef: `hopak:payment:${p.id}`,
      amount: p.amount.toFixed(2),
      occurredAt: (p.settledAt ?? new Date(0)).toISOString(),
      status: 'PAID' as const,
      unitCode: `dorm:${p.booking.room.dorm.id}`,
      unitName: p.booking.room.dorm.name,
      meta: {
        bookingId: p.booking.id,
        paymentStatus: p.status,
        method: p.method,
        commission: p.commission.toFixed(2),
        chamberShare: p.chamberShare.toFixed(2),
        platformShare: p.platformShare.toFixed(2),
        ownerPayout: p.ownerPayout.toFixed(2),
        room: p.booking.room.name,
        province: p.booking.room.dorm.province,
        rentalType: p.booking.rentalType,
        checkInDate: p.booking.checkInDate.toISOString().slice(0, 10),
        nights: p.booking.nights ?? null,
      },
    }));

    return { source: 'hopak', generatedAt: now.toISOString(), since: since.toISOString(), until: until.toISOString(), count: items.length, items };
  }
}

function parseDate(v?: string): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
