import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { issueGoogleOAuthState } from '../google-oauth-state';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const response = context.switchToHttp().getResponse<Response>();
    // Passport adds this opaque value to Google's authorization URL.
    return { state: issueGoogleOAuthState(response) };
  }
}
