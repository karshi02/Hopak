import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'dev-secret',
    });
  }

  // เช็ค session ทุก request (ถ้า token มี jti) — เตะออกจากอุปกรณ์นั้นได้จริงโดยไม่ต้อง
  // รอ token หมดอายุเอง (7 วัน) แค่ set revokedAt ฝั่ง Session แล้ว request ถัดไปโดนบล็อกทันที
  // token เก่าที่ไม่มี jti (ออกก่อนฟีเจอร์นี้มีอยู่) ปล่อยผ่านไป ไม่บังคับ logout ทุกคนทันที
  async validate(payload: { sub: string; role: string; jti?: string }) {
    if (payload.jti) {
      const session = await this.prisma.session.findUnique({ where: { jti: payload.jti } });
      if (!session || session.revokedAt) throw new UnauthorizedException('เซสชันนี้ถูกออกจากระบบแล้ว');
      this.prisma.session.update({ where: { jti: payload.jti }, data: { lastSeenAt: new Date() } }).catch(() => {});
    }
    return { id: payload.sub, role: payload.role };
  }
}
