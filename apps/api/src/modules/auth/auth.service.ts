import { BadRequestException, ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../../prisma.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const SALT_ROUNDS = 10;
const RESET_TTL_MS = 30 * 60 * 1000;
const RESET_RESEND_COOLDOWN_MS = 60 * 1000;
const MIN_PASSWORD_LENGTH = 6;

const hashResetToken = (token: string) => createHash('sha256').update(token).digest('hex');

export interface DeviceInfo {
  userAgent?: string;
  ip?: string;
}

@Injectable()
export class AuthService {
  private logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private mail: MailService,
  ) {}

  // jti ใหม่ทุกครั้งที่ login ผูกกับ Session แถวใหม่ — ให้เตะออกจากอุปกรณ์นั้นได้จริงทีหลัง
  // (ไม่กระทบ token เก่าของอุปกรณ์อื่นที่ login ค้างอยู่ก่อนหน้า)
  private async sign(user: { id: string; role: string }, device?: DeviceInfo) {
    const jti = randomUUID();
    await this.prisma.session.create({
      data: { userId: user.id, jti, userAgent: device?.userAgent, ip: device?.ip },
    });
    return this.jwt.sign({ sub: user.id, role: user.role.toLowerCase(), jti });
  }

  private omitPassword<T extends { password?: string | null; otpCodeHash?: string | null }>(user: T) {
    const { password: _password, otpCodeHash: _otpCodeHash, ...rest } = user;
    return rest;
  }

  async register(dto: RegisterDto, device?: DeviceInfo) {
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    try {
      const user = await this.prisma.user.create({
        data: {
          role: 'TENANT',
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          password: passwordHash,
        },
      });
      return { accessToken: await this.sign(user, device), user: this.omitPassword(user) };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const target = (err.meta?.target as string[] | undefined) ?? [];
        if (target.includes('email')) throw new ConflictException('อีเมลนี้ถูกใช้งานแล้ว');
        if (target.includes('phone')) throw new ConflictException('เบอร์โทรนี้ถูกใช้งานแล้ว');
        throw new ConflictException('ข้อมูลนี้ถูกใช้งานแล้ว');
      }
      throw err;
    }
  }

  private async verifyCredentials(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: dto.email ? { email: dto.email } : { phone: dto.phone },
    });
    if (!user || !user.password) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    if (user.suspended) throw new UnauthorizedException('บัญชีนี้ถูกระงับการใช้งาน');

    return user;
  }

  async login(dto: LoginDto, device?: DeviceInfo) {
    const user = await this.verifyCredentials(dto);
    if (user.role === 'ADMIN') throw new UnauthorizedException('Invalid credentials');
    return { accessToken: await this.sign(user, device), user: this.omitPassword(user) };
  }

  async adminLogin(dto: LoginDto, device?: DeviceInfo) {
    const user = await this.verifyCredentials(dto);
    if (user.role !== 'ADMIN') throw new UnauthorizedException('Invalid credentials');
    return { accessToken: await this.sign(user, device), user: this.omitPassword(user) };
  }

  async loginWithGoogle(profile: { googleId: string; email?: string; name: string }, device?: DeviceInfo) {
    let user = await this.prisma.user.findUnique({ where: { googleId: profile.googleId } });

    // เคยสมัครด้วยอีเมล/รหัสผ่านปกติมาก่อนแล้วมา login ด้วย Google อีเมลเดียวกัน
    // ผูก googleId เข้าบัญชีเดิมแทนที่จะสร้างใหม่ซ้ำ (ชน unique constraint ที่ email)
    if (!user && profile.email) {
      const existingByEmail = await this.prisma.user.findUnique({ where: { email: profile.email } });
      if (existingByEmail) {
        user = await this.prisma.user.update({
          where: { id: existingByEmail.id },
          data: { googleId: profile.googleId },
        });
      }
    }

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          role: 'TENANT',
          name: profile.name,
          email: profile.email,
          googleId: profile.googleId,
        },
      });
    }
    if (user.suspended) throw new UnauthorizedException('บัญชีนี้ถูกระงับการใช้งาน');
    return { accessToken: await this.sign(user, device), user: this.omitPassword(user) };
  }

  // คืน { ok: true } เสมอไม่ว่าอีเมลจะมีในระบบหรือไม่ — กัน user enumeration
  // (ถ้าตอบต่างกันจะกลายเป็นเครื่องมือให้คนไล่เช็คว่าอีเมลไหนสมัครไว้แล้วบ้าง)
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (user && !user.suspended) {
      const recentlySent =
        user.resetTokenSentAt && Date.now() - user.resetTokenSentAt.getTime() < RESET_RESEND_COOLDOWN_MS;

      if (!recentlySent) {
        const token = randomBytes(32).toString('hex');
        const now = new Date();
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            resetTokenHash: hashResetToken(token),
            resetTokenExpiresAt: new Date(now.getTime() + RESET_TTL_MS),
            resetTokenSentAt: now,
          },
        });

        const link = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
        const sent = await this.mail.send(
          email,
          'ตั้งรหัสผ่านใหม่ Hopak',
          `<p>มีคำขอตั้งรหัสผ่านใหม่สำหรับบัญชี Hopak ของคุณ</p>
           <p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#2F6FE0;color:#fff;border-radius:8px;text-decoration:none">ตั้งรหัสผ่านใหม่</a></p>
           <p>ลิงก์นี้ใช้ได้ครั้งเดียวและหมดอายุใน 30 นาที</p>
           <p style="color:#888">ถ้าคุณไม่ได้เป็นคนขอ ไม่ต้องทำอะไร รหัสผ่านเดิมยังใช้งานได้ตามปกติ</p>`,
        );
        if (!sent) this.logger.warn(`[DEV fallback] ส่งอีเมลไม่สำเร็จ — ลิงก์รีเซ็ตของ ${email} คือ ${link}`);
      }
    }

    return { ok: true };
  }

  async resetPassword(token: string, newPassword: string) {
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      throw new BadRequestException(`รหัสผ่านต้องยาวอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`);
    }

    const user = await this.prisma.user.findFirst({ where: { resetTokenHash: hashResetToken(token) } });
    if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว');
    }
    if (user.suspended) throw new UnauthorizedException('บัญชีนี้ถูกระงับการใช้งาน');

    // ตั้งรหัสใหม่ + ล้าง token (ใช้ได้ครั้งเดียว) + เตะทุกอุปกรณ์ที่ค้าง login อยู่ออก
    // (ถ้าคนที่ขโมยบัญชีไปยัง login ค้างอยู่ การเปลี่ยนรหัสอย่างเดียวไม่ได้ตัด token เดิมของเขา)
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: await bcrypt.hash(newPassword, SALT_ROUNDS),
          resetTokenHash: null,
          resetTokenExpiresAt: null,
          resetTokenSentAt: null,
        },
      }),
      this.prisma.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { ok: true };
  }
}
