import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dormId: string, dto: CreateReviewDto) {
    const stayedHere = await this.prisma.booking.findFirst({
      where: {
        tenantId,
        status: { in: ['PAID', 'COMPLETED'] },
        room: { dormId },
      },
    });
    if (!stayedHere) {
      throw new BadRequestException('รีวิวได้เฉพาะหอที่เคยจองและชำระเงินแล้วเท่านั้น');
    }

    const existing = await this.prisma.review.findUnique({
      where: { dormId_tenantId: { dormId, tenantId } },
    });
    if (existing) throw new ConflictException('คุณรีวิวหอพักนี้ไปแล้ว');

    return this.prisma.review.create({
      data: { dormId, tenantId, rating: dto.rating, comment: dto.comment },
    });
  }

  async listForDorm(dormId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { dormId },
      include: { tenant: { select: { name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const avgRating = reviews.length
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;
    return { reviews, avgRating, count: reviews.length };
  }

  async summaryForDorms(dormIds: string[]) {
    const reviews = await this.prisma.review.findMany({
      where: { dormId: { in: dormIds } },
      select: { dormId: true, rating: true },
    });
    const map = new Map<string, { total: number; count: number }>();
    for (const r of reviews) {
      const entry = map.get(r.dormId) ?? { total: 0, count: 0 };
      entry.total += r.rating;
      entry.count += 1;
      map.set(r.dormId, entry);
    }
    const result = new Map<string, { avgRating: number | null; reviewCount: number }>();
    for (const id of dormIds) {
      const entry = map.get(id);
      result.set(id, { avgRating: entry ? entry.total / entry.count : null, reviewCount: entry?.count ?? 0 });
    }
    return result;
  }
}
