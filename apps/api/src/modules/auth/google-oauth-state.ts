import { randomBytes, timingSafeEqual } from 'crypto';
import type { CookieOptions, Request, Response } from 'express';

export const GOOGLE_OAUTH_STATE_COOKIE = 'hopak_google_oauth_state';
export const GOOGLE_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
export const GOOGLE_OAUTH_EXCHANGE_COOKIE = 'hopak_google_oauth_exchange';
export const GOOGLE_OAUTH_EXCHANGE_TTL_MS = 2 * 60 * 1000;

function cookieOptions(path: string, maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
    path,
  };
}

function clearCookieOptions(path: string): CookieOptions {
  const { maxAge: _maxAge, ...options } = cookieOptions(path, GOOGLE_OAUTH_STATE_TTL_MS);
  return options;
}

function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;

  const prefix = `${name}=`;
  const value = header.split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix))?.slice(prefix.length);
  if (!value) return undefined;

  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

export function issueGoogleOAuthState(res: Response): string {
  const state = randomBytes(32).toString('base64url');
  res.cookie(GOOGLE_OAUTH_STATE_COOKIE, state, cookieOptions('/auth/google', GOOGLE_OAUTH_STATE_TTL_MS));
  return state;
}

export function consumeGoogleOAuthState(req: Request, res: Response): boolean {
  const expected = readCookie(req.headers.cookie, GOOGLE_OAUTH_STATE_COOKIE);
  const provided = typeof req.query.state === 'string' ? req.query.state : undefined;

  // State must be single-use, including when validation fails.
  res.clearCookie(GOOGLE_OAUTH_STATE_COOKIE, clearCookieOptions('/auth/google'));

  if (!expected || !provided) return false;
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  return expectedBytes.length === providedBytes.length && timingSafeEqual(expectedBytes, providedBytes);
}

// A second secret binds the frontend code exchange to the browser that completed OAuth.
// It is sent only to the exchange endpoint and cleared on every exchange attempt.
export function issueGoogleOAuthExchangeBinding(res: Response): string {
  const binding = randomBytes(32).toString('base64url');
  res.cookie(
    GOOGLE_OAUTH_EXCHANGE_COOKIE,
    binding,
    cookieOptions('/auth/google/exchange', GOOGLE_OAUTH_EXCHANGE_TTL_MS),
  );
  return binding;
}

export function consumeGoogleOAuthExchangeBinding(req: Request, res: Response): string | undefined {
  const binding = readCookie(req.headers.cookie, GOOGLE_OAUTH_EXCHANGE_COOKIE);
  res.clearCookie(GOOGLE_OAUTH_EXCHANGE_COOKIE, clearCookieOptions('/auth/google/exchange'));
  return binding;
}
