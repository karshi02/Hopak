import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

const SETTINGS_ID = 'site';

export interface PromoCard {
  tagTh: string;
  titleTh: string;
  subTh: string;
  tagEn: string;
  titleEn: string;
  subEn: string;
}

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getHero() {
    const settings = await this.prisma.siteSettings.findUnique({ where: { id: SETTINGS_ID } });
    return {
      heroImageUrl: settings?.heroImageUrl ?? null,
      posterUrls: settings?.posterUrls ?? [],
      areaImages: (settings?.areaImages as Record<string, string>) ?? {},
      promoCards: (settings?.promoCards as unknown as PromoCard[]) ?? [],
    };
  }

  // รับการ์ดจุดขายทั้งชุด (แทนที่ของเดิมทั้งหมด) — เก็บได้สูงสุด 3 ใบตามดีไซน์หน้าแรก
  // ตัด field ที่ไม่รู้จักออก + trim กันข้อมูลขยะ; ถ้าส่ง array ว่างมา = กลับไปใช้ข้อความ default
  async setPromoCards(cards: PromoCard[]) {
    const clean = (cards ?? []).slice(0, 3).map((c) => ({
      tagTh: String(c.tagTh ?? '').trim(),
      titleTh: String(c.titleTh ?? '').trim(),
      subTh: String(c.subTh ?? '').trim(),
      tagEn: String(c.tagEn ?? '').trim(),
      titleEn: String(c.titleEn ?? '').trim(),
      subEn: String(c.subEn ?? '').trim(),
    }));
    const settings = await this.prisma.siteSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, promoCards: clean as unknown as object },
      update: { promoCards: clean as unknown as object },
    });
    return { promoCards: settings.promoCards as unknown as PromoCard[] };
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
