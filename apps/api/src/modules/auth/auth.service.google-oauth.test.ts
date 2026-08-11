import { AuthService } from './auth.service';

describe('Google OAuth security boundaries', () => {
  function exchangeService() {
    const service = Object.create(AuthService.prototype) as AuthService;
    (service as any).googleCodes = new Map();
    return service;
  }

  it('requires the browser exchange binding and consumes the code after a failed attempt', () => {
    const service = exchangeService();
    const code = service.createGoogleExchangeCode('jwt-for-alice', 'alice-browser-secret');

    expect(() => service.exchangeGoogleCode(code, 'mallory-browser-secret')).toThrow('รหัสเข้าสู่ระบบไม่ถูกต้องหรือหมดอายุ');
    expect(() => service.exchangeGoogleCode(code, 'alice-browser-secret')).toThrow('รหัสเข้าสู่ระบบไม่ถูกต้องหรือหมดอายุ');
  });

  it('returns a token only when the original browser binding matches', () => {
    const service = exchangeService();
    const code = service.createGoogleExchangeCode('jwt-for-alice', 'alice-browser-secret');

    expect(service.exchangeGoogleCode(code, 'alice-browser-secret')).toEqual({ accessToken: 'jwt-for-alice' });
  });

  it('refuses to auto-link a Google identity to an existing local email account', async () => {
    const prisma = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ id: 'pre-registered-account', email: 'alice@example.test', password: 'hash' }),
      },
    };
    const service = new AuthService(prisma as any, {} as any, {} as any);

    await expect(
      service.loginWithGoogle({ googleId: 'alice-google-id', email: 'alice@example.test', name: 'Alice' }),
    ).rejects.toThrow('อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบด้วยวิธีเดิม');
    expect(prisma.user.findUnique).toHaveBeenNthCalledWith(2, { where: { email: 'alice@example.test' } });
  });
});
