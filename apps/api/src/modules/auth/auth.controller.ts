import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService, type DeviceInfo } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { GoogleCallbackGuard } from './guards/google-callback.guard';
import { TurnstileService } from '../../common/turnstile.service';
import { consumeGoogleOAuthExchangeBinding, issueGoogleOAuthExchangeBinding } from './google-oauth-state';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

function deviceFromReq(req: Request): DeviceInfo {
  return { userAgent: req.headers['user-agent'], ip: req.ip };
}

// ส่งให้ Cloudflare ตรวจคู่กับ token (ช่วยจับ token ที่ถูกขโมยไปใช้จากที่อื่น)
function ipFromReq(req: Request): string | undefined {
  return req.ip;
}

@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  constructor(
    private authService: AuthService,
    private turnstile: TurnstileService,
  ) {}

  @Post('register')
  @RateLimit(10, 60_000) // สมัคร: 10 ครั้ง/นาที/IP
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    // ด่านกันบอทสมัครรัว — rate limit อย่างเดียวกันสคริปต์ที่หมุน IP ไม่อยู่
    await this.turnstile.verify(dto.turnstileToken, ipFromReq(req), 'signup');
    return this.authService.register(dto, deviceFromReq(req));
  }

  @Post('login')
  @RateLimit(10, 60_000) // login: 10 ครั้ง/นาที/IP กันเดารหัสรัว
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, deviceFromReq(req));
  }

  // เข้าสู่ระบบฝั่งเจ้าของหอ — คนละบัญชีกับฝั่งผู้เช่า แม้อีเมลเดียวกัน
  @Post('partner-login')
  @RateLimit(10, 60_000)
  partnerLogin(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.partnerLogin(dto, deviceFromReq(req));
  }

  @Post('admin-login')
  @RateLimit(10, 60_000)
  adminLogin(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.adminLogin(dto, deviceFromReq(req));
  }

  @Post('forgot-password')
  @RateLimit(5, 60_000) // ส่งอีเมลรีเซ็ต: 5 ครั้ง/นาที/IP กันสแปมอีเมล
  forgotPassword(@Body() dto: ForgotPasswordDto & { role?: string }) {
    // ?role=owner = รีเซ็ตรหัสของบัญชีเจ้าของหอ (อีเมลเดียวกันมีได้ 2 บัญชี)
    return this.authService.forgotPassword(dto.email, dto.role === 'owner' ? 'OWNER' : 'TENANT');
  }

  @Post('reset-password')
  @RateLimit(10, 60_000)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  // heartbeat ฝั่ง client เรียกเช็คว่า session ยังใช้ได้ไหม (ไม่มี guard — รับ token ผ่าน header เอง
  // เพื่อไม่ให้ JwtStrategy bump lastSeenAt ซึ่งจะกันไม่ให้ session idle หมดอายุ)
  @Get('session')
  checkSession(@Req() req: Request) {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    return this.authService.checkSession(token);
  }

  // web callback เอาโค้ดจาก ?code= มาแลกเป็น JWT จริงผ่าน POST (ไม่ผ่าน URL/log)
  @Post('google/exchange')
  @RateLimit(20, 60_000)
  googleExchange(@Body() body: { code: string }, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.exchangeGoogleCode(body.code, consumeGoogleOAuthExchangeBinding(req, res));
  }

  // หน้าสมัครเจ้าของหอเอาโค้ดมาแลกเป็น "ชื่อ + อีเมล" ของบัญชี Google เพื่อกรอกฟอร์มให้ (ยังไม่ล็อกอิน)
  // path ต้องอยู่ใต้ /auth/google/exchange — cookie binding ถูกตั้ง path นั้นไว้
  // ถ้าตั้งเป็น /auth/google/profile-exchange เบราว์เซอร์จะไม่ส่ง cookie มาด้วย แล้วแลกโค้ดไม่ผ่าน
  @Post('google/exchange/profile')
  @RateLimit(20, 60_000)
  googleProfileExchange(
    @Body() body: { code: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.exchangeGoogleProfileCode(body.code, consumeGoogleOAuthExchangeBinding(req, res));
  }

  // ?intent=owner | owner_register | tenant — GoogleAuthGuard เป็นคนอ่านและตั้ง cookie hopak_oauth_intent
  // (guard redirect ไป Google ตั้งแต่ใน canActivate เมธอดนี้จึงไม่เคยถูกเรียกจริง)
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth() {
    // ไม่มีอะไรต้องทำ — passport พาไป Google ตั้งแต่ใน guard แล้ว
  }

  @Get('google/callback')
  @UseGuards(GoogleCallbackGuard)
  async googleAuthCallback(@Req() req: any, @Res() res: Response) {
    // อ่าน cookie จาก header ตรงๆ — โปรเจกต์นี้ไม่ได้ใช้ cookie-parser (req.cookies จะเป็น undefined)
    // อ่านนอก try เพราะตอน error ต้องรู้ว่าจะเด้งกลับหน้าล็อกอินฝั่งไหน
    const intent = (req.headers.cookie ?? '')
      .split(';')
      .map((part: string) => part.trim())
      .find((part: string) => part.startsWith('hopak_oauth_intent='))
      ?.slice('hopak_oauth_intent='.length);
    res.clearCookie('hopak_oauth_intent');
    const isOwner = intent === 'owner';
    try {
      // สมัครเปิดหอพัก: ไม่ล็อกอิน ไม่แตะบัญชี แค่ส่งชื่อ/อีเมลกลับไปกรอกฟอร์มขั้นตอนที่ 1 ให้
      if (intent === 'owner_register') {
        const binding = issueGoogleOAuthExchangeBinding(res);
        const code = this.authService.createGoogleProfileCode(req.user, binding);
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Referrer-Policy', 'no-referrer');
        res.redirect(`${FRONTEND_URL}/partner-register?gcode=${code}`);
        return;
      }
      const { accessToken } = await this.authService.loginWithGoogle(
        req.user,
        deviceFromReq(req),
        isOwner ? 'OWNER' : 'TENANT',
      );
      // ส่ง "โค้ดแลก token" ชั่วคราวผ่าน query (?code=) ไม่ใช่ JWT ตรงๆ — query รอด redirect ข้าม origin
      // (fragment # หายตอน 302) โค้ดใช้ครั้งเดียว/หมดอายุ 2 นาที หลุด log ก็ไร้ค่า ต่างจาก JWT 7 วัน
      const binding = issueGoogleOAuthExchangeBinding(res);
      const code = this.authService.createGoogleExchangeCode(accessToken, binding);
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.redirect(`${FRONTEND_URL}/auth/google/callback?code=${code}`);
    } catch (err) {
      // ส่งเป็น "โค้ด" คงที่เท่านั้น ไม่ส่งข้อความ error ดิบออก URL (กันข้อมูลภายในรั่วเข้า history/log/Referer)
      const raw = err instanceof Error ? err.message : '';
      const code = raw.includes('ระงับ')
        ? 'account_suspended'
        : raw.includes('ยังไม่มีบัญชีเจ้าของหอ')
          ? 'no_owner_account'
          : raw.includes('มีบัญชีอยู่แล้ว')
            ? 'use_password_login'
            : 'google_login_failed';
      // เด้งกลับหน้าเดียวกับที่กดมา ไม่งั้นเจ้าของหอโดนโยนไปหน้าผู้เช่า
      const back =
        intent === 'owner_register' ? '/partner-register' : isOwner ? '/partner-login' : '/login';
      res.redirect(`${FRONTEND_URL}${back}?error=${code}`);
    }
  }
}
