import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

function prismaWithAdmin(adminRole: string | null) {
  return {
    session: {
      findUnique: jest.fn().mockResolvedValue({ lastSeenAt: new Date() }),
      update: jest.fn().mockResolvedValue({}),
    },
    admin: {
      findUnique: jest.fn().mockResolvedValue(adminRole ? { adminRole } : null),
    },
  };
}

describe('JwtStrategy admin roles', () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  it('loads the current admin sub-role for an admin JWT', async () => {
    const prisma = prismaWithAdmin('FINANCE');
    const strategy = new JwtStrategy(prisma as any);

    await expect(strategy.validate({ sub: 'admin-1', role: 'admin', jti: 'jti-1' })).resolves.toEqual({
      id: 'admin-1',
      role: 'admin',
      adminRole: 'FINANCE',
    });
    expect(prisma.admin.findUnique).toHaveBeenCalledWith({
      where: { userId: 'admin-1' },
      select: { adminRole: true },
    });
  });

  it('rejects an admin JWT without an Admin role record', async () => {
    const prisma = prismaWithAdmin(null);
    const strategy = new JwtStrategy(prisma as any);

    await expect(strategy.validate({ sub: 'admin-1', role: 'admin', jti: 'jti-1' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
