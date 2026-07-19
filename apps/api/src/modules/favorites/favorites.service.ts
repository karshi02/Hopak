import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async toggle(userId: string, dormId: string) {
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_dormId: { userId, dormId } },
    });
    if (existing) {
      await this.prisma.favorite.delete({ where: { id: existing.id } });
      return { favorited: false };
    }
    await this.prisma.favorite.create({ data: { userId, dormId } });
    return { favorited: true };
  }

  async listMine(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      include: { dorm: { include: { rooms: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return favorites.map((f) => f.dorm);
  }

  async idsForUser(userId: string): Promise<string[]> {
    const favorites = await this.prisma.favorite.findMany({ where: { userId }, select: { dormId: true } });
    return favorites.map((f) => f.dormId);
  }
}
