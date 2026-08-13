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

  it('refuses to link a Google identity to an existing account that never verified its email', async () => {
    // สถานการณ์โจมตี: คนร้ายจองอีเมลเหยื่อไว้ก่อนพร้อมรหัสผ่านของตัวเอง (ยังไม่ได้ยืนยันอีเมล)
    // แล้วรอเหยื่อกดเข้าด้วย Google เพื่อให้ระบบผูกบัญชีให้ = ยึดบัญชีสำเร็จ
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({
          id: 'squatted-account',
          email: 'alice@example.test',
          password: 'hash',
          emailVerified: false,
        }),
        update: jest.fn(),
      },
    };
    const service = new AuthService(prisma as any, {} as any, {} as any);

    await expect(
      service.loginWithGoogle({
        googleId: 'alice-google-id',
        email: 'alice@example.test',
        emailVerified: true,
        name: 'Alice',
      }),
    ).rejects.toThrow('อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบด้วยอีเมลและรหัสผ่าน');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('refuses to link when Google itself has not verified the email', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({
          id: 'owner-account',
          email: 'alice@example.test',
          emailVerified: true,
        }),
        update: jest.fn(),
      },
    };
    const service = new AuthService(prisma as any, {} as any, {} as any);

    await expect(
      service.loginWithGoogle({
        googleId: 'alice-google-id',
        email: 'alice@example.test',
        emailVerified: false,
        name: 'Alice',
      }),
    ).rejects.toThrow('อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบด้วยอีเมลและรหัสผ่าน');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('never auto-creates an owner account from a Google login', async () => {
    const prisma = { user: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() } };
    const service = new AuthService(prisma as any, {} as any, {} as any);

    await expect(
      service.loginWithGoogle(
        { googleId: 'bob-google-id', email: 'bob@example.test', emailVerified: true, name: 'Bob' },
        undefined,
        'OWNER',
      ),
    ).rejects.toThrow('ยังไม่มีบัญชีเจ้าของหอสำหรับอีเมลนี้ กรุณาสมัครเปิดหอพักก่อน');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});
