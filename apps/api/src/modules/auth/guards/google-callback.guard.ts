import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { consumeGoogleOAuthState } from '../google-oauth-state';

@Injectable()
export class GoogleCallbackGuard extends AuthGuard('google') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    if (!consumeGoogleOAuthState(request, response)) {
      throw new UnauthorizedException('OAuth state ไม่ถูกต้องหรือหมดอายุ');
    }

    return super.canActivate(context);
  }
}
