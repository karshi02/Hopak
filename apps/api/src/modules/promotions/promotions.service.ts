import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class PromotionsService {
  constructor(private prisma: PrismaService) {}

  create(dormId: string, kind: 'BOOST' | 'BANNER' | 'FEATURED', startAt: Date, endAt: Date, price: number) {
    return this.prisma.campaign.create({ data: { dormId, kind, startAt, endAt, price } });
  }

  listAll() {
    return this.prisma.campaign.findMany({ include: { dorm: true }, orderBy: { startAt: 'desc' } });
  }

  activeSponsored() {
    const now = new Date();
    return this.prisma.campaign.findMany({
      where: { kind: 'FEATURED', startAt: { lte: now }, endAt: { gte: now } },
      include: { dorm: true },
    });
  }
}
