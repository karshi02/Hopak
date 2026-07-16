import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private sign(user: { id: string; role: string }) {
    return this.jwt.sign({ sub: user.id, role: user.role });
  }

  async register(dto: RegisterDto) {
    const user = await this.prisma.user.create({
      data: {
        role: 'TENANT',
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
      },
    });
    return { accessToken: this.sign(user), user };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: dto.email ? { email: dto.email } : { phone: dto.phone },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return { accessToken: this.sign(user), user };
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
    return { accessToken: this.sign(user), user };
  }
}
