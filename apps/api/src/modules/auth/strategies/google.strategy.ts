import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || 'unconfigured',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'unconfigured',
      callbackURL: `${process.env.API_URL || 'http://localhost:4000'}/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: {
      id: string;
      emails?: { value: string; verified?: boolean | string }[];
      displayName: string;
      _json?: { email_verified?: boolean | string };
    },
    done: VerifyCallback,
  ) {
    // Google บอกด้วยว่าอีเมลนี้ยืนยันแล้วจริงไหม — จำเป็นตอนตัดสินใจว่าจะผูกกับบัญชีเดิมที่สมัครด้วยรหัสผ่านได้ไหม
    // (ฟิลด์มาได้ทั้ง boolean และ string ตามเวอร์ชัน payload)
    const emailEntry = profile.emails?.[0];
    const emailVerified =
      String(emailEntry?.verified ?? profile._json?.email_verified ?? 'false').toLowerCase() === 'true';

    done(null, {
      googleId: profile.id,
      email: emailEntry?.value,
      emailVerified,
      name: profile.displayName,
    });
  }
}
