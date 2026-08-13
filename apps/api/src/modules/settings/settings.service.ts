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

export interface HomeTrustCard {
  titleTh: string;
  subTh: string;
}

export interface HomeContent {
  heroTitleTh?: string;
  heroSubtitleTh?: string;
  heroColor?: string; // สีพื้นหลัง hero ตอนไม่มีรูป (hex เช่น #178F5A) ว่าง = ใช้ gradient เริ่มต้น
  heroPos?: string; // ตำแหน่งรูป hero (background-position เช่น "50% 30%") ว่าง = center
  zonesTitleTh?: string;
  zonesSubTh?: string;
  trust?: HomeTrustCard[];
}

// สูงสุดต่อจังหวัด — การ์ดทำเลยอดนิยมเลื่อนดูได้ ไม่ควรยาวเกินจนคนเลื่อนไม่จบ
const MAX_AREA_IMAGES = 8;

/**
 * ข้อมูลเก่าเก็บจังหวัดละ 1 รูป (string) ตอนนี้เก็บได้หลายรูป (string[])
 * แปลงค่าเก่าให้เป็น array ตอนอ่าน — ไม่ต้อง migrate ข้อมูลใน DB
 */
function normalizeAreaImages(raw: unknown): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [province, value] of Object.entries((raw as Record<string, unknown>) ?? {})) {
    const urls = (Array.isArray(value) ? value : [value]).filter(
      (u): u is string => typeof u === 'string' && u.length > 0,
    );
    if (urls.length) out[province] = urls.slice(0, MAX_AREA_IMAGES);
  }
  return out;
}

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getHero() {
    const settings = await this.prisma.siteSettings.findUnique({ where: { id: SETTINGS_ID } });
    return {
      heroImageUrl: settings?.heroImageUrl ?? null,
      posterUrls: settings?.posterUrls ?? [],
      areaImages: normalizeAreaImages(settings?.areaImages),
      promoCards: (settings?.promoCards as unknown as PromoCard[]) ?? [],
      homeContent: (settings?.homeContent as unknown as HomeContent) ?? {},
    };
  }

  // ข้อความหน้าแรกที่แอดมินแก้แบบ inline — เก็บเฉพาะช่องที่กรอก (trim) ช่องว่าง = ลบ override กลับไปใช้ default
  async setHomeContent(content: HomeContent) {
    const s = (v: unknown) => String(v ?? '').trim();
    const clean: HomeContent = {};
    if (s(content.heroTitleTh)) clean.heroTitleTh = s(content.heroTitleTh);
    if (s(content.heroSubtitleTh)) clean.heroSubtitleTh = s(content.heroSubtitleTh);
    // รับเฉพาะ hex สั้น/ยาว กันค่าขยะ ว่าง = ลบ (กลับไปใช้ gradient)
    if (/^#[0-9a-fA-F]{3,8}$/.test(s(content.heroColor))) clean.heroColor = s(content.heroColor);
    // ตำแหน่งรูป "X% Y%" (0-100) กันค่าขยะ ว่าง/ผิดรูป = ไม่เก็บ (หน้าเว็บใช้ center)
    if (/^\d{1,3}% \d{1,3}%$/.test(s(content.heroPos))) clean.heroPos = s(content.heroPos);
    if (s(content.zonesTitleTh)) clean.zonesTitleTh = s(content.zonesTitleTh);
    if (s(content.zonesSubTh)) clean.zonesSubTh = s(content.zonesSubTh);
    if (Array.isArray(content.trust)) {
      clean.trust = content.trust
        .slice(0, 3)
        .map((c) => ({ titleTh: s(c?.titleTh), subTh: s(c?.subTh) }))
        .filter((c) => c.titleTh || c.subTh);
    }
    const settings = await this.prisma.siteSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, homeContent: clean as unknown as object },
      update: { homeContent: clean as unknown as object },
    });
    return { homeContent: settings.homeContent as unknown as HomeContent };
  }

  // เอารูปพื้นหลัง hero ออก กลับไปใช้ gradient เริ่มต้น
  async clearHero() {
    const settings = await this.prisma.siteSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, heroImageUrl: null },
      update: { heroImageUrl: null },
    });
    return { heroImageUrl: settings.heroImageUrl };
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

  // รูปการ์ด "ทำเลยอดนิยม" หน้าแรก — ผูกกับชื่อจังหวัดตรงๆ เพิ่มได้หลายรูป (หน้าแรกเลื่อนดูทีละรูป)
  async addAreaImages(province: string, urls: string[]) {
    const existing = await this.prisma.siteSettings.findUnique({ where: { id: SETTINGS_ID } });
    const current = normalizeAreaImages(existing?.areaImages);
    const areaImages = {
      ...current,
      [province]: [...(current[province] ?? []), ...urls].slice(0, MAX_AREA_IMAGES),
    };
    const settings = await this.prisma.siteSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, areaImages },
      update: { areaImages },
    });
    return { areaImages: normalizeAreaImages(settings.areaImages) };
  }

  // ไม่ส่ง index = ลบรูปของจังหวัดนั้นทั้งหมด · ส่ง index = ลบเฉพาะรูปนั้น
  async removeAreaImage(province: string, index?: number) {
    const existing = await this.prisma.siteSettings.findUnique({ where: { id: SETTINGS_ID } });
    const areaImages = normalizeAreaImages(existing?.areaImages);
    if (index === undefined || Number.isNaN(index)) {
      delete areaImages[province];
    } else {
      const rest = (areaImages[province] ?? []).filter((_, i) => i !== index);
      if (rest.length) areaImages[province] = rest;
      else delete areaImages[province];
    }
    const settings = await this.prisma.siteSettings.update({ where: { id: SETTINGS_ID }, data: { areaImages } });
    return { areaImages: normalizeAreaImages(settings.areaImages) };
  }
}
