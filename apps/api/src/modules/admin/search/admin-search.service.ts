import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';

@Injectable()
export class AdminSearchService {
  constructor(private prisma: PrismaService) {}

  async search(q: string) {
    const term = q?.trim();
    if (!term || term.length < 2) return { dorms: [], users: [], bookings: [] };

    const [dorms, users, bookings] = await Promise.all([
      this.prisma.dorm.findMany({
        where: {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { owner: { name: { contains: term, mode: 'insensitive' } } },
          ],
        },
        select: { id: true, name: true, status: true, owner: { select: { name: true } } },
        take: 5,
      }),
      this.prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { phone: { contains: term } },
            { email: { contains: term, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, role: true, phone: true, email: true },
        take: 5,
      }),
      this.prisma.booking.findMany({
        where: {
          OR: [{ id: term }, { contactName: { contains: term, mode: 'insensitive' } }],
        },
        select: { id: true, contactName: true, status: true, amount: true },
        take: 5,
      }),
    ]);

    return { dorms, users, bookings };
  }
}
