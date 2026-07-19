import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';

@Injectable()
export class OwnerRequestsService {
  constructor(private prisma: PrismaService) {}

  listPending() {
    return this.prisma.ownerRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approve(id: string) {
    const request = await this.prisma.ownerRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Request not found');

    await this.prisma.user.update({ where: { id: request.userId }, data: { role: 'OWNER' } });
    return this.prisma.ownerRequest.update({
      where: { id },
      data: { status: 'APPROVED', decidedAt: new Date() },
    });
  }

  async reject(id: string) {
    const request = await this.prisma.ownerRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Request not found');

    return this.prisma.ownerRequest.update({
      where: { id },
      data: { status: 'REJECTED', decidedAt: new Date() },
    });
  }
}
