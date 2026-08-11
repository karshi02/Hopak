import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma.service';
import { requireEnv } from '../../../common/env.util';
import type { AdminRole } from '../../../common/decorators/admin-roles.decorator';
//import { PrismaService } from '../../../prisma.service'; --- IGNORE ---
// idle timeout: ไม่มี activity เกิน 30 นาที → session หมดอายุ auto-logout
// ไม่มี activity เกิน 30 นาที = session หมดอายุ auto-logout (กัน session ค้างถูกขโมยใช้ต่อ)
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: requireEnv('JWT_SECRET'),
    });
  }
  //เช็ค session ทุก request (ถ้า token มี jti) — เตะออกจากอุปกรณ์นั้นได้จริงโดยไม่ต้อง
  // เช็ค session ทุก request (ถ้า token มี jti) — เตะออกจากอุปกรณ์นั้นได้จริงโดยไม่ต้อง
  // รอ token หมดอายุเอง (7 วัน) แค่ set revokedAt ฝั่ง Session แล้ว request ถัดไปโดนบล็อกทันที
  // token เก่าที่ไม่มี jti (ออกก่อนฟีเจอร์นี้มีอยู่) ปล่อยผ่านไป ไม่บังคับ logout ทุกคนทันที
  async validate(payload: { sub: string; role: string; jti?: string }) {
    if (payload.jti) {
      const session = await this.prisma.session.findUnique({ where: { jti: payload.jti } });
      if (!session || session.revokedAt) throw new UnauthorizedException('เซสชันนี้ถูกออกจากระบบแล้ว');

      // idle timeout: ไม่ได้ใช้งานเกิน 30 นาที → revoke แล้วบล็อกทันที (auto-logout)
      if (Date.now() - session.lastSeenAt.getTime() > IDLE_TIMEOUT_MS) {
        await this.prisma.session
          .update({ where: { jti: payload.jti }, data: { revokedAt: new Date() } })
          .catch(() => {});
        throw new UnauthorizedException('เซสชันหมดอายุจากการไม่ใช้งาน');
      }

      this.prisma.session.update({ where: { jti: payload.jti }, data: { lastSeenAt: new Date() } }).catch(() => {});
    }
    let adminRole: AdminRole | undefined;
    if (payload.role === 'admin') {
      const admin = await this.prisma.admin.findUnique({
        where: { userId: payload.sub },
        select: { adminRole: true },
      });
      if (!admin) throw new UnauthorizedException('บัญชีแอดมินไม่มีสิทธิ์ที่กำหนด');
      adminRole = admin.adminRole as AdminRole;
    }

    return { id: payload.sub, role: payload.role, adminRole };
  }
}
//ปิด session ทุก request (ถ้า token มี jti) — เตะออกจากอุปกรณ์นั้นได้จริงโดยไม่ต้อง
// ปิด session ทุก request (ถ้า token มี jti) — เตะออกจากอุปกรณ์นั้นได้จริงโดยไม่ต้อง
// รอ token หมดอายุเอง (7 วัน) แค่ set revokedAt ฝั่ง Session แล้ว request ถัดไปโดนบล็อกทันที
// token เก่าที่ไม่มี jti (ออกก่อนฟีเจอร์นี้มีอยู่) ปล่อยผ่านไป ไม่บังคับ logout ทุกคนทันที
