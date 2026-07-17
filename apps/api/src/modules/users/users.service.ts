import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

const SELECT_SAFE = {
  id: true,
  role: true,
  name: true,
  email: true,
  phone: true,
  avatarUrl: true,
  googleId: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id }, select: SELECT_SAFE });
  }

  updateProfile(id: string, data: { name?: string; avatarUrl?: string }) {
    return this.prisma.user.update({ where: { id }, data, select: SELECT_SAFE });
  }

  becomeOwner(id: string) {
    return this.prisma.user.update({ where: { id }, data: { role: 'OWNER' }, select: SELECT_SAFE });
  }
}
