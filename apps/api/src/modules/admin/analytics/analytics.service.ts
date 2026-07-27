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
      select: { commission: true, createdAt: true },
    });

    const months = Array.from({ length: 12 }, () => 0);
    for (const p of payments) {
      months[p.createdAt.getMonth()] += p.commission;
    }
    return { year, months };
  }
}
