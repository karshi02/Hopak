import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
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
import { consumeGoogleOAuthExchangeBinding, issueGoogleOAuthExchangeBinding } from './google-oauth-state';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

function deviceFromReq(req: Request): DeviceInfo {
  return { userAgent: req.headers['user-agent'], ip: req.ip };
}

@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @RateLimit(10, 60_000) // สมัคร: 10 ครั้ง/นาที/IP
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, deviceFromReq(req));
  }

  @Post('login')
  @RateLimit(10, 60_000) // login: 10 ครั้ง/นาที/IP กันเดารหัสรัว
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, deviceFromReq(req));
  }

  @Post('admin-login')
  @RateLimit(10, 60_000)
  adminLogin(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.adminLogin(dto, deviceFromReq(req));
  }

  @Post('forgot-password')
  @RateLimit(5, 60_000) // ส่งอีเมลรีเซ็ต: 5 ครั้ง/นาที/IP กันสแปมอีเมล
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
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

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(GoogleCallbackGuard)
  async googleAuthCallback(@Req() req: any, @Res() res: Response) {
    try {
      const { accessToken } = await this.authService.loginWithGoogle(req.user, deviceFromReq(req));
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
      const code = raw.includes('ระงับ') ? 'account_suspended' : 'google_login_failed';
      res.redirect(`${FRONTEND_URL}/login?error=${code}`);
    }
  }
}
