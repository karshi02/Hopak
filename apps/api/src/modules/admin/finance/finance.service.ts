import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  async summary() {
    const settled = await this.prisma.payment.findMany({ where: { status: { in: ['SETTLED', 'TRANSFERRED'] } } });
    const totalCommission = settled.reduce((sum, p) => sum + p.commission, 0);
    const totalPayout = settled.reduce((sum, p) => sum + p.ownerPayout, 0);
    return { totalCommission, totalPayout, count: settled.length };
  }

  transferToOwners() {
    return this.prisma.payment.updateMany({
      where: { status: 'SETTLED' },
      data: { status: 'TRANSFERRED' },
    });
  }
}
