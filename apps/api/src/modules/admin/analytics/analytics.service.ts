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
}
