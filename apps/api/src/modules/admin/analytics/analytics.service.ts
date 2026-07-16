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
}
