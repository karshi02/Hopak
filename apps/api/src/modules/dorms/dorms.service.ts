import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateDormDto } from './dto/create-dorm.dto';
import { UpdateDormDto } from './dto/update-dorm.dto';
import { SearchQueryDto } from './dto/search-query.dto';
import { ReviewsService } from '../reviews/reviews.service';

@Injectable()
export class DormsService {
  constructor(
    private prisma: PrismaService,
    private reviewsService: ReviewsService,
  ) {}

  async search(query: SearchQueryDto) {
    const dorms = await this.prisma.dorm.findMany({
      where: {
        status: 'APPROVED',
        province: query.province,
        university: query.university,
        ...(query.q
          ? {
              OR: [
                { name: { contains: query.q, mode: 'insensitive' as const } },
                { province: { contains: query.q, mode: 'insensitive' as const } },
                { university: { contains: query.q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      include: { rooms: true },
    });
    const ratings = await this.reviewsService.summaryForDorms(dorms.map((d) => d.id));
    return dorms.map((d) => ({ ...d, ...ratings.get(d.id) }));
  }

  async findOne(id: string) {
    const dorm = await this.prisma.dorm.findUniqueOrThrow({ where: { id }, include: { rooms: true } });
    const ratings = await this.reviewsService.summaryForDorms([id]);
    return { ...dorm, ...ratings.get(id) };
  }

  listMine(ownerId: string) {
    return this.prisma.dorm.findMany({
      where: { ownerId },
      include: { rooms: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(ownerId: string, dto: CreateDormDto) {
    return this.prisma.dorm.create({
      data: { ...dto, ownerId, status: 'PENDING_APPROVAL' },
    });
  }

  async update(ownerId: string, id: string, dto: UpdateDormDto) {
    const dorm = await this.prisma.dorm.findUnique({ where: { id } });
    if (!dorm) throw new NotFoundException('Dorm not found');
    if (dorm.ownerId !== ownerId) throw new ForbiddenException('Not your dorm');
    return this.prisma.dorm.update({ where: { id }, data: dto });
  }
}
