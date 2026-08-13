import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { MSK_DISTRICTS, findDistrict } from '@hopak/shared';
import { PrismaService } from '../../prisma.service';
import { UploadsService } from '../uploads/uploads.service';

/**
 * สถานที่สำคัญ/ท่องเที่ยวรายอำเภอ — ดึงจาก Google Places แล้วเก็บลง DB
 *
 * ทำไมต้อง cache: Places คิดเงินต่อการเรียก หน้าแรกมีคนเข้าตลอดเวลา
 * ถ้ายิงสดทุกครั้งที่มีคนเปิดหน้าจะบานปลายทันที — sync ทีเดียวแล้วอ่านจาก DB
 * รูปก็โหลดมาเก็บเป็นไฟล์ของเราเองตอน sync (Places Photo คิดเงินแยกอีกต่อ)
 */
// ประเภทที่ถือว่าเป็น "ที่เที่ยว" จริง — วัด/โบราณสถาน/พิพิธภัณฑ์/สวน/จุดชมวิว
const KEEP_TYPES = [
  'tourist_attraction',
  'place_of_worship',
  'hindu_temple',
  'church',
  'mosque',
  'museum',
  'park',
  'natural_feature',
  'art_gallery',
  'zoo',
  'aquarium',
  'amusement_park',
  'campground',
  'stadium',
  'library',
  // สถานศึกษา — คนหาหอเลือกทำเลจากที่เรียนเป็นหลัก สำคัญกว่าที่เที่ยวด้วยซ้ำ
  'university',
  'school',
  'primary_school',
  'secondary_school',
];

// ตัดทิ้งเสมอแม้จะติดประเภทข้างบนด้วย — พวกนี้ไม่ใช่ที่เที่ยว
// (รอบแรกดึงมาได้ฟาร์มควาย/โฮมสเตย์/ร้านอาหารเต็มไปหมด เพราะ Places จัดอันดับตาม rating ในหมวดกว้างๆ)
const DROP_TYPES = [
  'lodging',
  'restaurant',
  'cafe',
  'food',
  'bar',
  'store',
  'supermarket',
  'shopping_mall',
  'real_estate_agency',
  'car_repair',
  'gas_station',
  'lawyer',
];

// ประเภทสถานศึกษา — ผ่อนเกณฑ์รีวิวให้ เพราะโรงเรียนส่วนใหญ่แทบไม่มีคนรีวิว
// แต่เป็นหมุดหมายที่คนหาหอใช้เลือกทำเลจริง
const EDU_TYPES = ['university', 'school', 'primary_school', 'secondary_school'];

// ชื่อที่ตัดทิ้งเสมอ — Places ให้ประเภท 'school' กับพวกนี้ด้วย แต่ไม่ใช่หมุดหมายที่ใครใช้เลือกทำเล
// (รอบก่อนได้ "ครูเบส ติวเตอร์", "คุมองมหาสารคาม", "กศน.ตำบล..." ติดมาเต็มไปหมด)
const NAME_BLOCK = ['ติวเตอร์', 'คุมอง', 'กศน.', 'สอนพิเศษ', 'ศูนย์การศึกษาพิเศษ', 'tutor', 'kumon'];

// คณะ/วิทยาเขตย่อย — ซ้ำกับมหาวิทยาลัยแม่ที่ถูกเลือกอยู่แล้ว กินที่เปล่าๆ
const SUB_UNIT = ['คณะ', 'วิทยาลัยการเมือง', 'faculty', 'สาขาวิชา'];

// ต้องมีรีวิวพอสมควร ไม่งั้นได้ที่ที่ไม่มีใครรู้จักซึ่งคนหาหอไม่ได้ประโยชน์
const MIN_REVIEWS = 10;
const MIN_REVIEWS_EDU = 0;

interface PlaceResult {
  place_id?: string;
  name?: string;
  formatted_address?: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  geometry?: { location?: { lat?: number; lng?: number } };
  photos?: { photo_reference?: string }[];
}

@Injectable()
export class LandmarksService {
  private logger = new Logger(LandmarksService.name);

  constructor(
    private prisma: PrismaService,
    private uploads: UploadsService,
  ) {}

  private apiKey() {
    // ต้องเป็นคีย์ฝั่งเซิร์ฟเวอร์ (จำกัดด้วย IP) คนละตัวกับ NEXT_PUBLIC ที่จำกัดด้วย referrer
    const key = process.env.GOOGLE_PLACES_API_KEY;
    if (!key) throw new BadRequestException('ยังไม่ได้ตั้งค่า GOOGLE_PLACES_API_KEY');
    return key;
  }

  /** อ่านจาก DB อย่างเดียว — ไม่แตะ Google (หน้าแรกเรียกทางนี้) */
  async list(province: string) {
    const rows = await this.prisma.landmark.findMany({
      where: { province },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return rows.map((l) => ({
      id: l.id,
      name: l.name,
      district: l.district,
      province: l.province,
      lat: l.lat,
      lng: l.lng,
      imageUrl: l.imageUrl,
      rating: l.rating,
    }));
  }

  /**
   * ดึงสถานที่ของทุกอำเภอในจังหวัดจาก Google Places (Text Search)
   * เรียกจากฝั่งแอดมินเท่านั้น — ไม่ผูกกับ traffic ของผู้ใช้
   */
  async sync(province: string, perDistrict = 4) {
    const key = this.apiKey();
    // ตอนนี้รองรับมหาสารคาม (จังหวัดหลักของแพลตฟอร์ม) — จังหวัดอื่นยังไม่มีชุดอำเภอในระบบ
    const districts = MSK_DISTRICTS.map((d) => d.name);
    let saved = 0;
    const skipped: string[] = [];

    const keptPlaceIds: string[] = [];

    for (const district of districts) {
      // ค้นเป็นข้อความไทยตรงๆ ได้ผลดีกว่า Nearby Search ที่ต้องมีพิกัดกลางอำเภอ (ซึ่งเราไม่มี)
      // ยิง 2 คำค้นต่ออำเภอ — คำเดียวได้ผลเอียงไปทางเดียว (รอบแรกได้ฟาร์ม/โฮมสเตย์เป็นส่วนใหญ่)
      const queries = [
        `วัด ${district} ${province}`,
        `สถานที่ท่องเที่ยว ${district} ${province}`,
        `มหาวิทยาลัย ${district} ${province}`,
        `โรงเรียน ${district} ${province}`,
      ];
      const found = new Map<string, PlaceResult>();
      let failed = false;

      for (const query of queries) {
        let json: { status?: string; error_message?: string; results?: PlaceResult[] };
        try {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&language=th&region=th&key=${key}`,
          );
          json = (await res.json()) as typeof json;
        } catch (err) {
          this.logger.error(`เรียก Places ไม่สำเร็จ (${district}): ${String(err)}`);
          failed = true;
          break;
        }

        if (json.status && json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
          this.logger.error(`Places ตอบ ${json.status} (${district}): ${json.error_message ?? '-'}`);
          failed = true;
          break;
        }

        for (const r of json.results ?? []) if (r.place_id) found.set(r.place_id, r);
      }

      if (failed) {
        skipped.push(district);
        continue;
      }

      const candidates = [...found.values()]
        // เอาเฉพาะที่อยู่ในอำเภอนั้นจริง — ผลค้นหามักหลุดข้ามอำเภอ
        .filter((r) => findDistrict(r.formatted_address) === district)
        // ต้องเป็นที่เที่ยว/วัดจริง ไม่ใช่ที่พัก ร้านอาหาร หรือฟาร์มที่ติดหมวดกว้างๆ มา
        .filter((r) => {
          const types = r.types ?? [];
          if (types.some((tp) => DROP_TYPES.includes(tp))) return false;
          return types.some((tp) => KEEP_TYPES.includes(tp));
        })
        .filter((r) => {
          const isEdu = (r.types ?? []).some((tp) => EDU_TYPES.includes(tp));
          return (r.user_ratings_total ?? 0) >= (isEdu ? MIN_REVIEWS_EDU : MIN_REVIEWS);
        })
        .filter((r) => {
          const name = (r.name ?? '').toLowerCase();
          if (NAME_BLOCK.some((w) => name.includes(w.toLowerCase()))) return false;
          // คณะย่อยเอาออกเฉพาะตอนที่มหาวิทยาลัยแม่อยู่ในผลค้นเดียวกันแล้ว
          return !SUB_UNIT.some((w) => name.includes(w.toLowerCase()));
        });

      // คนรู้จักมากมาก่อน — rating สูงจากรีวิว 3 อันไม่ได้แปลว่าเป็นที่สำคัญจริง
      const byPopularity = (a: PlaceResult, b: PlaceResult) =>
        (b.user_ratings_total ?? 0) - (a.user_ratings_total ?? 0) || (b.rating ?? 0) - (a.rating ?? 0);
      const isEdu = (r: PlaceResult) => (r.types ?? []).some((tp) => EDU_TYPES.includes(tp));

      // แบ่งโควตาครึ่งๆ ระหว่างสถานศึกษากับวัด/ที่เที่ยว
      // ถ้าเรียงรวมกันแล้วตัด สถานศึกษาจะกินหมดทุกช่อง (โรงเรียนมีเยอะกว่ามาก) วัดดังๆ หลุดหาย
      const eduPicks = candidates.filter(isEdu).sort(byPopularity);
      const spotPicks = candidates.filter((r) => !isEdu(r)).sort(byPopularity);
      const half = Math.ceil(perDistrict / 2);
      const picks = [
        ...eduPicks.slice(0, half),
        ...spotPicks.slice(0, perDistrict - Math.min(eduPicks.length, half)),
      ].slice(0, perDistrict);

      for (const [i, place] of picks.entries()) {
        const lat = place.geometry?.location?.lat;
        const lng = place.geometry?.location?.lng;
        if (!place.place_id || !place.name || lat == null || lng == null) continue;

        const existing = await this.prisma.landmark.findUnique({ where: { placeId: place.place_id } });
        // รูปโหลดครั้งเดียวพอ — มีอยู่แล้วไม่ต้องยิง Places Photo ซ้ำ
        const imageUrl =
          existing?.imageUrl ?? (await this.savePhoto(place.place_id, place.photos?.[0]?.photo_reference, key));

        await this.prisma.landmark.upsert({
          where: { placeId: place.place_id },
          create: {
            placeId: place.place_id,
            name: place.name,
            province,
            district,
            address: place.formatted_address,
            lat,
            lng,
            imageUrl,
            rating: place.rating ?? null,
            sortOrder: i,
          },
          update: {
            name: place.name,
            district,
            address: place.formatted_address,
            lat,
            lng,
            imageUrl,
            rating: place.rating ?? null,
            sortOrder: i,
            syncedAt: new Date(),
          },
        });
        keptPlaceIds.push(place.place_id);
        saved += 1;
      }
    }

    // ลบของเก่าที่ตกเกณฑ์รอบนี้ทิ้ง (เช่น ฟาร์ม/โฮมสเตย์ที่เคยดึงมาก่อนปรับตัวกรอง)
    // ข้ามอำเภอที่เรียกไม่สำเร็จ ไม่งั้นเน็ตสะดุดทีเดียวข้อมูลหายทั้งอำเภอ
    const removed = skipped.length
      ? { count: 0 }
      : await this.prisma.landmark.deleteMany({
          where: { province, placeId: { notIn: keptPlaceIds } },
        });

    return { province, saved, removed: removed.count, skipped };
  }

  /** โหลดรูปจาก Places Photo มาเก็บเป็นไฟล์ของเราเอง — จะได้ไม่ต้องยิงหา Google ทุกครั้งที่มีคนเปิดหน้า */
  private async savePhoto(placeId: string, photoRef: string | undefined, key: string): Promise<string | null> {
    if (!photoRef) return null;
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${encodeURIComponent(photoRef)}&key=${key}`,
      );
      if (!res.ok) return null;
      const contentType = res.headers.get('content-type') ?? 'image/jpeg';
      const buffer = Buffer.from(await res.arrayBuffer());
      const ext = contentType.includes('png') ? 'png' : 'jpg';
      return await this.uploads.upload(`landmarks/${placeId}.${ext}`, buffer, contentType, 'public');
    } catch (err) {
      this.logger.warn(`โหลดรูปสถานที่ไม่สำเร็จ (${placeId}): ${String(err)}`);
      return null;
    }
  }

  async remove(id: string) {
    await this.prisma.landmark.delete({ where: { id } });
    return { deleted: true };
  }
}
