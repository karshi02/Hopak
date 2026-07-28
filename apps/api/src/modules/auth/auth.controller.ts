import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AuthService, type DeviceInfo } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';

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

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: any, @Res() res: Response) {
    try {
      const { accessToken } = await this.authService.loginWithGoogle(req.user, deviceFromReq(req));
      // ส่ง token ผ่าน URL fragment (#) ไม่ใช่ query (?) — fragment เบราว์เซอร์ไม่ส่งไป server
      // จึงไม่หลุดเข้า nginx access log และไม่รั่วผ่าน Referer header ไปยัง resource บนหน้านั้น
      res.redirect(`${FRONTEND_URL}/auth/google/callback#token=${accessToken}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'google_login_failed';
      res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent(message)}`);
    }
  }
}
