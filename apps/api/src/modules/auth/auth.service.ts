import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private sign(user: { id: string; role: string }) {
    return this.jwt.sign({ sub: user.id, role: user.role.toLowerCase() });
  }

  private omitPassword<T extends { password?: string | null }>(user: T) {
    const { password: _password, ...rest } = user;
    return rest;
  }

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        role: 'TENANT',
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        password: passwordHash,
      },
    });
    return { accessToken: this.sign(user), user: this.omitPassword(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: dto.email ? { email: dto.email } : { phone: dto.phone },
    });
    if (!user || !user.password) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return { accessToken: this.sign(user), user: this.omitPassword(user) };
  }

  async loginWithGoogle(profile: { googleId: string; email?: string; name: string }) {
    let user = await this.prisma.user.findUnique({ where: { googleId: profile.googleId } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          role: 'TENANT',
          name: profile.name,
          email: profile.email,
          googleId: profile.googleId,
        },
      });
    }
    return { accessToken: this.sign(user), user: this.omitPassword(user) };
  }
}
