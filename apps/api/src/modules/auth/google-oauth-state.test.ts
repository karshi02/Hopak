import type { Request, Response } from 'express';
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_STATE_TTL_MS,
  consumeGoogleOAuthState,
  consumeGoogleOAuthExchangeBinding,
  issueGoogleOAuthState,
  issueGoogleOAuthExchangeBinding,
} from './google-oauth-state';

function responseStub() {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as Response;
}

function requestWithState(state: string | undefined, cookie?: string): Request {
  return {
    headers: { cookie },
    query: state === undefined ? {} : { state },
  } as unknown as Request;
}

describe('Google OAuth state', () => {
  it('issues a high-entropy state in an HttpOnly, short-lived cookie', () => {
    const response = responseStub();
    const state = issueGoogleOAuthState(response);

    expect(state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(response.cookie).toHaveBeenCalledWith(
      GOOGLE_OAUTH_STATE_COOKIE,
      state,
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        maxAge: GOOGLE_OAUTH_STATE_TTL_MS,
        path: '/auth/google',
      }),
    );
  });

  it('accepts only the matching callback state and always clears the cookie', () => {
    const response = responseStub();
    const valid = consumeGoogleOAuthState(
      requestWithState('expected-state', `${GOOGLE_OAUTH_STATE_COOKIE}=expected-state`),
      response,
    );

    expect(valid).toBe(true);
    expect(response.clearCookie).toHaveBeenCalledWith(
      GOOGLE_OAUTH_STATE_COOKIE,
      expect.not.objectContaining({ maxAge: expect.anything() }),
    );
  });

  it.each([
    ['missing cookie', requestWithState('expected-state')],
    ['missing callback value', requestWithState(undefined, `${GOOGLE_OAUTH_STATE_COOKIE}=expected-state`)],
    ['mismatched callback value', requestWithState('other-state', `${GOOGLE_OAUTH_STATE_COOKIE}=expected-state`)],
  ])('rejects %s', (_name, request) => {
    const response = responseStub();

    expect(consumeGoogleOAuthState(request, response)).toBe(false);
    expect(response.clearCookie).toHaveBeenCalledTimes(1);
  });

  it('issues and consumes a separate HttpOnly exchange binding cookie', () => {
    const response = responseStub();
    const binding = issueGoogleOAuthExchangeBinding(response);

    expect(binding).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(response.cookie).toHaveBeenCalledWith(
      'hopak_google_oauth_exchange',
      binding,
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/auth/google/exchange' }),
    );

    expect(
      consumeGoogleOAuthExchangeBinding(
        requestWithState(undefined, `hopak_google_oauth_exchange=${binding}`),
        response,
      ),
    ).toBe(binding);
    expect(response.clearCookie).toHaveBeenCalledWith(
      'hopak_google_oauth_exchange',
      expect.not.objectContaining({ maxAge: expect.anything() }),
    );
  });
});
