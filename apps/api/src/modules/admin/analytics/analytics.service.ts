import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async bookingsByProvince() {
    const bookings = await this.prisma.booking.findMany({
      include: { room: { include: { dorm: true } } },
    });
    const counts: Record<string, number> = {};
    for (const b of bookings) {
      const province = b.room.dorm.province;
      counts[province] = (counts[province] ?? 0) + 1;
    }
    return counts;
  }

  async summary() {
    const [totalUsers, totalDorms, totalBookings, settledPayments] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.dorm.count(),
      this.prisma.booking.count(),
      this.prisma.payment.findMany({ where: { status: { in: ['SETTLED', 'TRANSFERRED'] } } }),
    ]);
    const totalRevenue = settledPayments.reduce((sum, p) => sum + p.commission, 0);

    return { totalUsers, totalDorms, totalBookings, totalRevenue };
  }

  // ค่าคอมมิชชันแยกตามเดือน ปีปัจจุบัน (12 เดือน) — ใช้วาดกราฟรายได้ในแดชบอร์ด
  async monthlyRevenue() {
    const year = new Date().getFullYear();
    const payments = await this.prisma.payment.findMany({
      where: {
        status: { in: ['SETTLED', 'TRANSFERRED'] },
        createdAt: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) },
      },
      select: { amount: true, commission: true, ownerPayout: true, createdAt: true },
    });

    // months[] = ค่าคอมต่อเดือน (คงไว้ให้ของเดิมใช้ได้)
    // breakdown[] = แจกแจงเต็มต่อเดือน สำหรับกราฟที่สลับรูปแบบได้ (ยอดรับ/คอม/ยอดเจ้าของหอ)
    const months = Array.from({ length: 12 }, () => 0);
    const breakdown = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      gross: 0,
      commission: 0,
      ownerPayout: 0,
      bookings: 0,
    }));
    for (const p of payments) {
      const index = p.createdAt.getMonth();
      months[index] += p.commission;
      breakdown[index].gross += p.amount;
      breakdown[index].commission += p.commission;
      breakdown[index].ownerPayout += p.ownerPayout;
      breakdown[index].bookings += 1;
    }
    return { year, months, breakdown };
  }
}
