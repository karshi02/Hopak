import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma.service';
import { MailService } from '../mail/mail.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

const SALT_ROUNDS = 10;
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const SELECT_SAFE = {
  id: true,
  role: true,
  name: true,
  email: true,
  phone: true,
  avatarUrl: true,
  address: true,
  googleId: true,
  emailVerified: true,
  bankName: true,
  bankAccountNumber: true,
  promptpayId: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  private logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  async findById(id: string) {
    const [user, reviewCount] = await Promise.all([
      this.prisma.user.findUnique({ where: { id }, select: SELECT_SAFE }),
      this.prisma.review.count({ where: { tenantId: id } }),
    ]);
    return user ? { ...user, reviewCount } : user;
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

  async sendVerificationOtp(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.email) throw new BadRequestException('บัญชีนี้ไม่มีอีเมลผูกไว้');
    if (user.emailVerified) throw new BadRequestException('บัญชีนี้ยืนยันอีเมลแล้ว');
    if (user.otpSentAt && Date.now() - user.otpSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
      throw new BadRequestException('กรุณารอสักครู่ก่อนขอรหัสใหม่');
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const otpCodeHash = await bcrypt.hash(code, SALT_ROUNDS);
    const now = new Date();

    await this.prisma.user.update({
      where: { id: userId },
      data: { otpCodeHash, otpExpiresAt: new Date(now.getTime() + OTP_TTL_MS), otpSentAt: now, otpAttempts: 0 },
    });

    const sent = await this.mail.send(
      user.email,
      'รหัสยืนยันอีเมล Hopak',
      `<p>รหัสยืนยันอีเมลของคุณคือ</p><h2 style="letter-spacing:4px">${code}</h2><p>รหัสนี้หมดอายุใน 10 นาที</p>`,
    );
    // ส่งไม่สำเร็จได้ทั้งเพราะ SMTP ยังไม่ตั้งค่า หรือ Resend sandbox mode reject โดเมนที่ไม่ verify
    // (ดูสาเหตุจริงจาก error log ของ MailService เอง) — log รหัสสำรองไว้ให้ทดสอบต่อได้ทั้งสองกรณี
    if (!sent) this.logger.warn(`[DEV fallback] ส่งอีเมลไม่สำเร็จ — OTP สำหรับ ${user.email} คือ ${code}`);

    return { sent, email: user.email };
  }

  async verifyEmailOtp(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.emailVerified) throw new BadRequestException('บัญชีนี้ยืนยันอีเมลแล้ว');
    if (!user.otpCodeHash || !user.otpExpiresAt) throw new BadRequestException('กรุณาขอรหัส OTP ก่อน');
    if (user.otpExpiresAt.getTime() < Date.now()) throw new UnauthorizedException('รหัส OTP หมดอายุ กรุณาขอรหัสใหม่');
    if (user.otpAttempts >= OTP_MAX_ATTEMPTS) {
      throw new UnauthorizedException('กรอกผิดเกินจำนวนที่กำหนด กรุณาขอรหัสใหม่');
    }

    const valid = await bcrypt.compare(code, user.otpCodeHash);
    if (!valid) {
      await this.prisma.user.update({ where: { id: userId }, data: { otpAttempts: { increment: 1 } } });
      throw new UnauthorizedException('รหัส OTP ไม่ถูกต้อง');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true, otpCodeHash: null, otpExpiresAt: null, otpAttempts: 0 },
      select: SELECT_SAFE,
    });
  }
}
