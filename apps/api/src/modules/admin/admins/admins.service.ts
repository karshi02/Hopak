import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';

@Injectable()
export class AdminsService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.admin.findMany({ include: { user: true } });
  }

  create(userId: string, adminRole: 'SUPER_ADMIN' | 'ADMIN' | 'FINANCE' | 'SUPPORT') {
    return this.prisma.admin.create({ data: { userId, adminRole } });
  }
}
