import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateDormDto } from './dto/create-dorm.dto';
import { UpdateDormDto } from './dto/update-dorm.dto';
import { SearchQueryDto } from './dto/search-query.dto';

@Injectable()
export class DormsService {
  constructor(private prisma: PrismaService) {}

  search(query: SearchQueryDto) {
    return this.prisma.dorm.findMany({
      where: {
        status: 'APPROVED',
        province: query.province,
        university: query.university,
      },
      include: { rooms: true },
    });
  }

  findOne(id: string) {
    return this.prisma.dorm.findUniqueOrThrow({ where: { id }, include: { rooms: true } });
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
