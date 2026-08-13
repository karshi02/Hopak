import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { issueGoogleOAuthState } from '../google-oauth-state';

// ฝั่งที่กดปุ่ม Google มา — คุมค่าที่รับได้ ไม่เอาค่าดิบจาก query ไปใส่ cookie ตรงๆ
const ALLOWED_INTENTS = ['owner', 'owner_register', 'tenant'] as const;

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // ต้องตั้ง cookie ตรงนี้ ไม่ใช่ใน route handler — guard สั่ง redirect ไป Google เลย
    // handler ของ GET /auth/google จึงไม่เคยถูกเรียก cookie ที่ตั้งในนั้นไม่เคยถูกส่งออก
    // ผลคือ callback อ่าน intent ไม่เจอ ตกไปเป็น tenant เสมอ = กดปุ่ม Google ฝั่งเจ้าของหอแล้วเด้งไปหน้าผู้เช่า
    const raw = String((request.query?.intent as string | undefined) ?? '');
    const intent = (ALLOWED_INTENTS as readonly string[]).includes(raw) ? raw : 'tenant';
    response.cookie('hopak_oauth_intent', intent, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 10 * 60 * 1000,
    });

    // Passport adds this opaque value to Google's authorization URL.
    return { state: issueGoogleOAuthState(response) };
  }
}
