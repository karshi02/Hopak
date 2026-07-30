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
// ต้องตรงกับ IDLE_TIMEOUT_MS ใน jwt.strategy.ts — ไม่ใช้งานเกิน 30 นาที = session หมดอายุ
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const RESET_TTL_MS = 30 * 60 * 1000;
const RESET_RESEND_COOLDOWN_MS = 60 * 1000;
const MIN_PASSWORD_LENGTH = 6;

const hashResetToken = (token: string) => createHash('sha256').update(token).digest('hex');

export interface DeviceInfo {
  userAgent?: string;
  ip?: string;
}

const GOOGLE_CODE_TTL_MS = 2 * 60 * 1000;

@Injectable()
export class AuthService {
  private logger = new Logger(AuthService.name);
  // โค้ดแลก token ชั่วคราวสำหรับ Google login — ส่งผ่าน query (?code=) ซึ่งรอด redirect ข้าม origin
  // ต่างจาก JWT ที่ส่งผ่าน fragment (#) แล้วหายตอน 302. โค้ดใช้ครั้งเดียว + หมดอายุ 2 นาที
  // จึงไม่อันตรายแม้หลุดเข้า log (ต่างจาก JWT อายุ 7 วันที่หลุดแล้วใช้เข้าบัญชีได้เลย)
  private googleCodes = new Map<string, { token: string; expiresAt: number }>();

  createGoogleExchangeCode(token: string): string {
    const code = randomBytes(24).toString('hex');
    this.googleCodes.set(code, { token, expiresAt: Date.now() + GOOGLE_CODE_TTL_MS });
    // กวาดโค้ดหมดอายุทิ้ง กัน map โตไม่มีที่สิ้นสุด
    for (const [k, v] of this.googleCodes) if (v.expiresAt < Date.now()) this.googleCodes.delete(k);
    return code;
  }

  exchangeGoogleCode(code: string): { accessToken: string } {
    const entry = this.googleCodes.get(code);
    this.googleCodes.delete(code); // ใช้ครั้งเดียวเสมอ
    if (!entry || entry.expiresAt < Date.now()) {
      throw new UnauthorizedException('รหัสเข้าสู่ระบบไม่ถูกต้องหรือหมดอายุ');
    }
    return { accessToken: entry.token };
  }

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private mail: MailService,
  ) {}

  // 1 บัญชี = 1 session (ตัวใหม่เตะตัวเก่า): ก่อนออก token ใหม่ revoke ทุก session เดิม
  // ที่ยัง active ของ user คนนี้ทิ้ง แล้วค่อยสร้างแถวใหม่ — อุปกรณ์เก่าจะโดน 401 request ถัดไป
  // (jwt.strategy เช็ค revokedAt) กันคนอื่นที่รู้รหัสเดียวกัน login ค้างพร้อมกันหลายเครื่อง
  private async sign(user: { id: string; role: string }, device?: DeviceInfo) {
    const jti = randomUUID();
    await this.prisma.$transaction([
      this.prisma.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.session.create({
        data: { userId: user.id, jti, userAgent: device?.userAgent, ip: device?.ip },
      }),
    ]);
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
          'ตั้งรหัสผ่านใหม่ Hoprak',
          `<p>มีคำขอตั้งรหัสผ่านใหม่สำหรับบัญชี Hoprak ของคุณ</p>
           <p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#2F6FE0;color:#fff;border-radius:8px;text-decoration:none">ตั้งรหัสผ่านใหม่</a></p>
           <p>ลิงก์นี้ใช้ได้ครั้งเดียวและหมดอายุใน 30 นาที</p>
           <p style="color:#888">ถ้าคุณไม่ได้เป็นคนขอ ไม่ต้องทำอะไร รหัสผ่านเดิมยังใช้งานได้ตามปกติ</p>`,
        );
        if (!sent) this.logger.warn(`[DEV fallback] ส่งอีเมลไม่สำเร็จ — ลิงก์รีเซ็ตของ ${email} คือ ${link}`);
      }
    }

    return { ok: true };
  }

  // เช็คว่า session ของ token นี้ยังใช้ได้ไหม (ถูกเตะจาก login ที่อื่น / idle หมดอายุ / revoke)
  // สำคัญ: ไม่อัปเดต lastSeenAt — ให้ heartbeat ฝั่ง client เรียกถี่ๆ ได้โดยไม่กันไม่ให้ session idle
  // (ต่างจาก request ปกติผ่าน JwtStrategy ที่ bump lastSeenAt ทุกครั้ง) client เอา val:false ไปเด้งออก
  async checkSession(token?: string): Promise<{ valid: boolean }> {
    if (!token) return { valid: false };
    let payload: { jti?: string };
    try {
      payload = this.jwt.verify(token);
    } catch {
      return { valid: false }; // หมดอายุจริง (7 วัน) หรือ signature ผิด
    }
    if (!payload?.jti) return { valid: true }; // token เก่าไม่มี jti — ปล่อยผ่านเหมือน JwtStrategy

    const session = await this.prisma.session.findUnique({ where: { jti: payload.jti } });
    if (!session || session.revokedAt) return { valid: false };
    if (Date.now() - session.lastSeenAt.getTime() > IDLE_TIMEOUT_MS) {
      await this.prisma.session
        .update({ where: { jti: payload.jti }, data: { revokedAt: new Date() } })
        .catch(() => {});
      return { valid: false };
    }
    return { valid: true };
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
