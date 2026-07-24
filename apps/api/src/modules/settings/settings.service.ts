import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

const SETTINGS_ID = 'site';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getHero() {
    const settings = await this.prisma.siteSettings.findUnique({ where: { id: SETTINGS_ID } });
    return { heroImageUrl: settings?.heroImageUrl ?? null };
  }

  async setHero(heroImageUrl: string) {
    const settings = await this.prisma.siteSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, heroImageUrl },
      update: { heroImageUrl },
    });
    return { heroImageUrl: settings.heroImageUrl };
  }
}
