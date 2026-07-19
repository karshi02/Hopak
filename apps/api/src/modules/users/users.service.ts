import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

const SALT_ROUNDS = 10;

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

  async updateProfile(id: string, data: UpdateProfileDto) {
    try {
      return await this.prisma.user.update({ where: { id }, data, select: SELECT_SAFE });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('เบอร์โทรนี้ถูกใช้งานแล้ว');
      }
      throw err;
    }
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.password) throw new UnauthorizedException('บัญชีนี้ล็อกอินผ่าน Google ไม่มีรหัสผ่านให้เปลี่ยน');

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new UnauthorizedException('รหัสผ่านปัจจุบันไม่ถูกต้อง');

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.prisma.user.update({ where: { id }, data: { password: passwordHash } });
    return { success: true };
  }

  async requestOwner(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'OWNER') throw new ConflictException('บัญชีนี้เป็นเจ้าของหอแล้ว');

    const pending = await this.prisma.ownerRequest.findFirst({ where: { userId, status: 'PENDING' } });
    if (pending) return pending;

    return this.prisma.ownerRequest.create({ data: { userId } });
  }

  myOwnerRequest(userId: string) {
    return this.prisma.ownerRequest.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }
}
