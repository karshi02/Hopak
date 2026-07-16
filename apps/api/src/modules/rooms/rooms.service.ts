import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  async create(ownerId: string, dormId: string, data: { type: 'AIR' | 'FAN'; pricePerMonth: number }) {
    const dorm = await this.prisma.dorm.findUnique({ where: { id: dormId } });
    if (!dorm) throw new NotFoundException('Dorm not found');
    if (dorm.ownerId !== ownerId) throw new ForbiddenException('Not your dorm');
    return this.prisma.room.create({ data: { ...data, dormId } });
  }

  listByDorm(dormId: string) {
    return this.prisma.room.findMany({ where: { dormId } });
  }

  async setStatus(ownerId: string, roomId: string, status: 'AVAILABLE' | 'OCCUPIED') {
    const room = await this.prisma.room.findUnique({ where: { id: roomId }, include: { dorm: true } });
    if (!room) throw new NotFoundException('Room not found');
    if (room.dorm.ownerId !== ownerId) throw new ForbiddenException('Not your room');
    return this.prisma.room.update({ where: { id: roomId }, data: { status } });
  }
}
