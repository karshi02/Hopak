import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  updateProfile(id: string, data: { name?: string; avatarUrl?: string }) {
    return this.prisma.user.update({ where: { id }, data });
  }

  becomeOwner(id: string) {
    return this.prisma.user.update({ where: { id }, data: { role: 'OWNER' } });
  }
}
