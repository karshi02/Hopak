import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { UploadsService } from '../../uploads/uploads.service';

@Injectable()
export class OwnerRequestsService {
  constructor(
    private prisma: PrismaService,
    private uploads: UploadsService,
  ) {}

  async listPending() {
    const requests = await this.prisma.ownerRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    // เอกสารเก็บเป็น storage key (private) — แปลงเป็นลิงก์ชั่วคราวก่อนส่งให้แอดมิน
    return requests.map((r) => ({ ...r, documents: r.documents.map((k) => this.uploads.getPrivateUrl(k)) }));
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
