import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

const SETTINGS_ID = 'site';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getHero() {
    const settings = await this.prisma.siteSettings.findUnique({ where: { id: SETTINGS_ID } });
    return {
      heroImageUrl: settings?.heroImageUrl ?? null,
      posterUrls: settings?.posterUrls ?? [],
      areaImages: (settings?.areaImages as Record<string, string>) ?? {},
    };
  }

  async setHero(heroImageUrl: string) {
    const settings = await this.prisma.siteSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, heroImageUrl },
      update: { heroImageUrl },
    });
    return { heroImageUrl: settings.heroImageUrl };
  }

  async addPosters(urls: string[]) {
    const existing = await this.prisma.siteSettings.findUnique({ where: { id: SETTINGS_ID } });
    const posterUrls = [...(existing?.posterUrls ?? []), ...urls];
    const settings = await this.prisma.siteSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, posterUrls },
      update: { posterUrls },
    });
    return { posterUrls: settings.posterUrls };
  }

  async removePoster(index: number) {
    const existing = await this.prisma.siteSettings.findUnique({ where: { id: SETTINGS_ID } });
    const posterUrls = (existing?.posterUrls ?? []).filter((_, i) => i !== index);
    const settings = await this.prisma.siteSettings.update({ where: { id: SETTINGS_ID }, data: { posterUrls } });
    return { posterUrls: settings.posterUrls };
  }

  // รูปพื้นหลังการ์ด "ทำเลยอดนิยม" หน้าแรก — ผูกกับชื่อจังหวัดตรงๆ ตั้งได้ทีละจังหวัด
  async setAreaImage(province: string, url: string) {
    const existing = await this.prisma.siteSettings.findUnique({ where: { id: SETTINGS_ID } });
    const areaImages = { ...((existing?.areaImages as Record<string, string>) ?? {}), [province]: url };
    const settings = await this.prisma.siteSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, areaImages },
      update: { areaImages },
    });
    return { areaImages: settings.areaImages as Record<string, string> };
  }

  async removeAreaImage(province: string) {
    const existing = await this.prisma.siteSettings.findUnique({ where: { id: SETTINGS_ID } });
    const areaImages = { ...((existing?.areaImages as Record<string, string>) ?? {}) };
    delete areaImages[province];
    const settings = await this.prisma.siteSettings.update({ where: { id: SETTINGS_ID }, data: { areaImages } });
    return { areaImages: settings.areaImages as Record<string, string> };
  }
}
