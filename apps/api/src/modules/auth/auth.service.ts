import { BadRequestException, ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'crypto';
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

// ใส่รหัสผิดครบ 10 ครั้งใน 30 นาที = พาไปหน้าตั้งรหัสใหม่ (ไม่บอกผู้ใช้ว่าผิดมากี่ครั้งแล้ว)
const MAX_LOGIN_FAILURES = 10;
const LOGIN_FAILURE_WINDOW_MS = 30 * 60 * 1000;

@Injectable()
export class AuthService {
  private logger = new Logger(AuthService.name);
  // โค้ดแลก token ชั่วคราวสำหรับ Google login — ส่งผ่าน query (?code=) ซึ่งรอด redirect ข้าม origin
  // ต่างจาก JWT ที่ส่งผ่าน fragment (#) แล้วหายตอน 302. โค้ดใช้ครั้งเดียว + หมดอายุ 2 นาที
  // จึงไม่อันตรายแม้หลุดเข้า log (ต่างจาก JWT อายุ 7 วันที่หลุดแล้วใช้เข้าบัญชีได้เลย)
  private googleCodes = new Map<string, { token: string; bindingHash: string; expiresAt: number }>();

  // นับรหัสผ่านผิดต่ออีเมล+ฝั่งที่ล็อกอิน เก็บในหน่วยความจำ (รีสตาร์ทแล้วหาย ยอมรับได้ — เป็นตัวช่วยผู้ใช้ ไม่ใช่ rate limit หลัก
  // ซึ่งมี RateLimitGuard คุมอยู่แล้ว) ข้อดีคือไม่ต้องเขียน DB ทุกครั้งที่มีคนเดารหัส
  private loginFailures = new Map<string, { count: number; expiresAt: number }>();

  createGoogleExchangeCode(token: string, binding: string): string {
    const code = randomBytes(24).toString('hex');
    const bindingHash = createHash('sha256').update(binding).digest('hex');
    this.googleCodes.set(code, { token, bindingHash, expiresAt: Date.now() + GOOGLE_CODE_TTL_MS });
    // กวาดโค้ดหมดอายุทิ้ง กัน map โตไม่มีที่สิ้นสุด
    for (const [k, v] of this.googleCodes) if (v.expiresAt < Date.now()) this.googleCodes.delete(k);
    return code;
  }

  // โปรไฟล์ Google สำหรับ "กรอกฟอร์มสมัครเจ้าของหอให้อัตโนมัติ" — ยังไม่ใช่การล็อกอิน ไม่มี token ผูกอยู่
  // ใช้กลไกโค้ดใช้ครั้งเดียวเหมือน login เพื่อไม่ให้ชื่อ/อีเมลโผล่ใน URL
  private googleProfiles = new Map<
    string,
    { profile: { name: string; email?: string; emailVerified: boolean }; bindingHash: string; expiresAt: number }
  >();

  createGoogleProfileCode(
    profile: { name: string; email?: string; emailVerified?: boolean },
    binding: string,
  ): string {
    const code = randomBytes(24).toString('hex');
    this.googleProfiles.set(code, {
      profile: { name: profile.name, email: profile.email, emailVerified: !!profile.emailVerified },
      bindingHash: createHash('sha256').update(binding).digest('hex'),
      expiresAt: Date.now() + GOOGLE_CODE_TTL_MS,
    });
    for (const [k, v] of this.googleProfiles) if (v.expiresAt < Date.now()) this.googleProfiles.delete(k);
    return code;
  }

  exchangeGoogleProfileCode(code: string, binding?: string) {
    const entry = this.googleProfiles.get(code);
    this.googleProfiles.delete(code); // ใช้ครั้งเดียวเสมอ
    const bindingHash = binding ? createHash('sha256').update(binding).digest('hex') : undefined;
    const ok = !!entry && !!bindingHash && entry.bindingHash === bindingHash && entry.expiresAt >= Date.now();
    if (!ok) throw new UnauthorizedException('รหัสเข้าสู่ระบบไม่ถูกต้องหรือหมดอายุ');
    return entry!.profile;
  }

  exchangeGoogleCode(code: string, binding?: string): { accessToken: string } {
    const entry = this.googleCodes.get(code);
    this.googleCodes.delete(code); // ใช้ครั้งเดียวเสมอ
    const bindingHash = binding ? createHash('sha256').update(binding).digest('hex') : undefined;
    const bindingMatches =
      !!entry &&
      !!bindingHash &&
      timingSafeEqual(Buffer.from(entry.bindingHash, 'hex'), Buffer.from(bindingHash, 'hex'));
    if (!entry || entry.expiresAt < Date.now() || !bindingMatches) {
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
        // index ใหม่เป็นคู่ (email, role) — ชนแปลว่ามีบัญชี "ผู้เช่า" ด้วยอีเมลนี้แล้ว
        // (บัญชีเจ้าของหออีเมลเดียวกันไม่ชน เพราะคนละ role)
        if (target.includes('email')) throw new ConflictException('อีเมลนี้มีบัญชีผู้เช่าอยู่แล้ว');
        if (target.includes('phone')) throw new ConflictException('เบอร์โทรนี้มีบัญชีผู้เช่าอยู่แล้ว');
        throw new ConflictException('ข้อมูลนี้ถูกใช้งานแล้ว');
      }
      throw err;
    }
  }

  // ค้นบัญชีตาม "บทบาท" ด้วยเสมอ — อีเมลเดียวกันมีได้ทั้งบัญชีผู้เช่าและบัญชีเจ้าของหอ
  // ถ้าไม่ระบุ role จะหลุดไปเจอบัญชีผิดฝั่ง (login ฝั่งผู้เช่าแล้วได้บัญชีเจ้าของหอ)
  private async verifyCredentials(dto: LoginDto, roles: ('TENANT' | 'OWNER' | 'ADMIN')[]) {
    const identity = dto.email ? { email: dto.email } : { phone: dto.phone };
    const failureKey = `${roles.join(',')}:${dto.email ?? dto.phone ?? ''}`.toLowerCase();

    const user = await this.prisma.user.findFirst({
      where: { ...identity, role: { in: roles } },
    });

    const wrong = !user || !user.password || !(await bcrypt.compare(dto.password, user.password));
    if (wrong) {
      // นับพลาดต่อ "อีเมล+ฝั่งที่ล็อกอิน" ไม่ว่าบัญชีจะมีจริงหรือไม่ — ถ้านับเฉพาะบัญชีที่มีจริง
      // การเด้งไปหน้าเปลี่ยนรหัสจะกลายเป็นตัวบอกว่าอีเมลไหนมีในระบบ
      const failures = this.bumpLoginFailure(failureKey);
      if (failures >= MAX_LOGIN_FAILURES) {
        // ข้อความยังเป็น "รหัสผ่านไม่ถูกต้อง" เหมือนเดิม ไม่บอกจำนวนครั้ง — ส่งแค่โค้ดให้หน้าเว็บพาไปตั้งรหัสใหม่
        throw new UnauthorizedException({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง', code: 'too_many_attempts' });
      }
      throw new UnauthorizedException({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง', code: 'invalid_credentials' });
    }

    if (user.suspended) throw new UnauthorizedException('บัญชีนี้ถูกระงับการใช้งาน');

    this.loginFailures.delete(failureKey); // เข้าได้แล้ว เริ่มนับใหม่
    return user;
  }

  private bumpLoginFailure(key: string): number {
    const now = Date.now();
    const entry = this.loginFailures.get(key);
    const count = entry && entry.expiresAt > now ? entry.count + 1 : 1;
    this.loginFailures.set(key, { count, expiresAt: now + LOGIN_FAILURE_WINDOW_MS });
    for (const [k, v] of this.loginFailures) if (v.expiresAt <= now) this.loginFailures.delete(k);
    return count;
  }

  // เข้าสู่ระบบฝั่งผู้เช่า — เห็นเฉพาะบัญชี TENANT
  async login(dto: LoginDto, device?: DeviceInfo) {
    const user = await this.verifyCredentials(dto, ['TENANT']);
    return { accessToken: await this.sign(user, device), user: this.omitPassword(user) };
  }

  // เข้าสู่ระบบฝั่งเจ้าของหอ — เห็นเฉพาะบัญชี OWNER (คนละบัญชีกับฝั่งผู้เช่าแม้อีเมลเดียวกัน)
  async partnerLogin(dto: LoginDto, device?: DeviceInfo) {
    const user = await this.verifyCredentials(dto, ['OWNER']);
    return { accessToken: await this.sign(user, device), user: this.omitPassword(user) };
  }

  async adminLogin(dto: LoginDto, device?: DeviceInfo) {
    const user = await this.verifyCredentials(dto, ['ADMIN']);
    return { accessToken: await this.sign(user, device), user: this.omitPassword(user) };
  }

  /**
   * เข้าสู่ระบบด้วย Google — ต้องรู้ว่าเข้ามาจากฝั่งไหน (ผู้เช่า/เจ้าของหอ)
   * เพราะบัญชีสองฝั่งแยกขาดกันแม้ใช้ Google account เดียวกัน
   * ฝั่งเจ้าของหอ: ไม่สร้างบัญชีใหม่ให้อัตโนมัติ ต้องสมัครผ่านหน้าเปิดหอพักก่อน (แอดมินอนุมัติ)
   */
  async loginWithGoogle(
    profile: { googleId: string; email?: string; emailVerified?: boolean; name: string },
    device?: DeviceInfo,
    role: 'TENANT' | 'OWNER' = 'TENANT',
  ) {
    let user = await this.prisma.user.findFirst({ where: { googleId: profile.googleId, role } });

    // ผูก Google identity เข้ากับบัญชีเดิมที่สมัครด้วยรหัสผ่านได้ ต่อเมื่อ "ยืนยันอีเมลแล้วทั้งสองฝั่ง":
    // Google ยืนยันว่าอีเมลนี้เป็นของคนที่เพิ่งล็อกอิน + บัญชีในระบบก็ผ่านการยืนยันอีเมล (OTP) มาแล้ว
    // ถ้าผูกด้วย email เฉยๆ ผู้โจมตีจะจองอีเมลเหยื่อไว้ก่อนพร้อมรหัสผ่านของตัวเอง แล้วรอเหยื่อกด Google เพื่อยึดบัญชีได้
    if (!user && profile.email) {
      const existingByEmail = await this.prisma.user.findFirst({ where: { email: profile.email, role } });
      if (existingByEmail) {
        if (!profile.emailVerified || !existingByEmail.emailVerified) {
          throw new ConflictException('อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบด้วยอีเมลและรหัสผ่าน');
        }
        user = await this.prisma.user.update({
          where: { id: existingByEmail.id },
          data: { googleId: profile.googleId },
        });
      }
    }

    // ฝั่งเจ้าของหอไม่สร้างบัญชีใหม่ให้อัตโนมัติ — ต้องสมัครผ่านหน้าเปิดหอพัก (มีเอกสาร/รอแอดมินอนุมัติ) ก่อน
    if (!user && role === 'OWNER') {
      throw new UnauthorizedException('ยังไม่มีบัญชีเจ้าของหอสำหรับอีเมลนี้ กรุณาสมัครเปิดหอพักก่อน');
    }

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          role: 'TENANT',
          name: profile.name,
          email: profile.email,
          // Google ยืนยันอีเมลให้แล้วก็ถือว่ายืนยันแล้ว ไม่ต้องให้ผู้ใช้ทำ OTP ซ้ำ
          emailVerified: profile.emailVerified ?? false,
          googleId: profile.googleId,
        },
      });
    }
    if (user.suspended) throw new UnauthorizedException('บัญชีนี้ถูกระงับการใช้งาน');
    return { accessToken: await this.sign(user, device), user: this.omitPassword(user) };
  }

  // คืน { ok: true } เสมอไม่ว่าอีเมลจะมีในระบบหรือไม่ — กัน user enumeration
  // (ถ้าตอบต่างกันจะกลายเป็นเครื่องมือให้คนไล่เช็คว่าอีเมลไหนสมัครไว้แล้วบ้าง)
  async forgotPassword(email: string, role: 'TENANT' | 'OWNER' = 'TENANT') {
    // อีเมลเดียวมีได้ทั้งบัญชีผู้เช่าและเจ้าของหอ — รีเซ็ตรหัสของฝั่งที่ผู้ใช้กดมาเท่านั้น
    const user = await this.prisma.user.findFirst({ where: { email, role } });

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
