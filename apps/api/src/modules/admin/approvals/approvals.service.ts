import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';

@Injectable()
export class ApprovalsService {
  constructor(private prisma: PrismaService) {}

  listPending() {
    return this.prisma.dorm.findMany({ where: { status: 'PENDING_APPROVAL' }, include: { owner: true } });
  }

  approve(dormId: string) {
    return this.prisma.dorm.update({ where: { id: dormId }, data: { status: 'APPROVED' } });
  }

  reject(dormId: string) {
    return this.prisma.dorm.update({ where: { id: dormId }, data: { status: 'REJECTED' } });
  }
}
