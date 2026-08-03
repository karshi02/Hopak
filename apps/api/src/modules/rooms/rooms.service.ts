import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { ReviewsService } from '../reviews/reviews.service';

interface CreateRoomData {
  type: 'AIR' | 'FAN';
  pricePerMonth: number;
  pricePerDay?: number;
  allowDaily?: boolean;
  name?: string;
  description?: string;
  deposit?: number;
  waterRate?: number;
  electricRate?: number;
  amenities?: string[];
  quantity?: number;
}

@Injectable()
export class RoomsService {
  constructor(
    private prisma: PrismaService,
    private uploads: UploadsService,
    private realtime: RealtimeGateway,
    private reviews: ReviewsService,
  ) {}

  private async assertOwnsDorm(ownerId: string, dormId: string) {
    const dorm = await this.prisma.dorm.findUnique({ where: { id: dormId } });
    if (!dorm) throw new NotFoundException('Dorm not found');
    if (dorm.ownerId !== ownerId) throw new ForbiddenException('Not your dorm');
    return dorm;
  }

  // สร้างห้องได้ทีละหลายห้อง (quantity) ที่ spec เดียวกัน — แต่ละห้องเป็น row แยกกัน จองแยกกันได้อิสระ
  // approved ตามค่า dorm.autoApproveRooms ตอนสร้าง — ถ้าหอนี้ยังไม่ถูกตั้งให้อนุมัติอัตโนมัติ ห้องใหม่จะรอแอดมินตรวจก่อนโชว์ผู้เช่า
  async create(ownerId: string, dormId: string, data: CreateRoomData, photoFiles: Express.Multer.File[]) {
    const dorm = await this.assertOwnsDorm(ownerId, dormId);

    const images: string[] = [];
    for (const file of photoFiles) {
      const key = `rooms/${dormId}/${Date.now()}-${file.originalname}`;
      const url = await this.uploads.upload(key, file.buffer, file.mimetype, 'public');
      images.push(url);
    }

    // ไม่ต้องกรอกชื่อห้อง — สุ่มให้อัตโนมัติ (ต่อห้องเพื่อไม่ให้ชื่อซ้ำกันในล็อตเดียว)
    const genName = () => {
      const letter = 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)];
      return `ห้อง ${letter}${100 + Math.floor(Math.random() * 900)}`;
    };
    const quantity = Math.max(1, Math.min(50, data.quantity ?? 1));
    const rows = Array.from({ length: quantity }, () => ({
      dormId,
      type: data.type,
      pricePerMonth: data.pricePerMonth,
      pricePerDay: data.pricePerDay ?? 0,
      allowDaily: data.allowDaily ?? false,
      name: data.name?.trim() || genName(),
      description: data.description,
      deposit: data.deposit ?? 0,
      waterRate: data.waterRate ?? 0,
      electricRate: data.electricRate ?? 0,
      amenities: data.amenities ?? [],
      images,
      approved: dorm.autoApproveRooms,
    }));

    await this.prisma.room.createMany({ data: rows });
    const created = await this.prisma.room.findMany({ where: { dormId }, orderBy: { id: 'desc' }, take: quantity });
    this.realtime.emitToRole('admin', 'room:new', created);
    return created;
  }

  // เฉพาะห้องที่ผ่านตรวจแล้ว — endpoint นี้เปิดสาธารณะ ไม่กรองจะรั่วห้องที่ยังไม่อนุมัติ
  listByDorm(dormId: string) {
    return this.prisma.room.findMany({ where: { dormId, approved: true } });
  }

  // ห้องเดี่ยวพร้อมข้อมูลหอ/คะแนนรีวิว — หน้าส่งคำขอจองต้องใช้สรุปค่าใช้จ่ายก่อนกดยืนยัน
  // เปิดสาธารณะเหมือน listByDorm จึงต้องกรองทั้ง room.approved และ dorm.status เหมือนกัน
  async findOne(id: string) {
    const room = await this.prisma.room.findFirst({
      where: { id, approved: true, dorm: { status: 'APPROVED' } },
      include: { dorm: { include: { owner: { select: { name: true } } } } },
    });
    if (!room) throw new NotFoundException('Room not found');

    const ratings = await this.reviews.summaryForDorms([room.dormId]);
    // ห้องไม่มีรูปเฉพาะของตัวเอง → ใช้รูปหอพัก (คำนวณตอนแสดง ไม่ก็อปลง DB)
    // = เจ้าของหอเปลี่ยนรูปหอเมื่อไหร่ ห้องอัปเดตตามทันที (เรียลไทม์) ไม่กระทบโปรไฟล์หอ
    const images = room.images.length ? room.images : room.dorm.images;
    return { ...room, images, dorm: { ...room.dorm, ...ratings.get(room.dormId) } };
  }

  // ตัด/คืนห้องด้วยมือ — เฉพาะแอดมิน (เดิมเป็นเจ้าของหอ ย้ายมาให้แอดมินคุมกันทุจริต)
  async setStatus(roomId: string, status: 'AVAILABLE' | 'OCCUPIED') {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');
    return this.prisma.room.update({ where: { id: roomId }, data: { status } });
  }

  private async assertOwnsRoom(ownerId: string, roomId: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId }, include: { dorm: true } });
    if (!room) throw new NotFoundException('Room not found');
    if (room.dorm.ownerId !== ownerId) throw new ForbiddenException('Not your room');
    return room;
  }

  // เจ้าของหอแก้ไขราคา/รายละเอียดห้องที่มีอยู่แล้วได้ (เดิมมีแค่สร้างใหม่ ไม่มีแก้ไข)
  async update(ownerId: string, roomId: string, data: Record<string, unknown>) {
    await this.assertOwnsRoom(ownerId, roomId);
    const allowed: (keyof CreateRoomData)[] = [
      'type',
      'pricePerMonth',
      'pricePerDay',
      'allowDaily',
      'name',
      'description',
      'deposit',
      'waterRate',
      'electricRate',
      'amenities',
    ];
    const patch: Record<string, unknown> = {};
    for (const key of allowed) {
      if (data[key] !== undefined) patch[key] = data[key];
    }
    return this.prisma.room.update({ where: { id: roomId }, data: patch });
  }

  async addImages(ownerId: string, roomId: string, files: Express.Multer.File[]) {
    const room = await this.assertOwnsRoom(ownerId, roomId);
    // ถ้าห้องยังไม่มีรูปของตัวเอง (ใช้รูปหอ fallback) → ดึงรูปหอมาเป็นฐานก่อน แล้วค่อยเพิ่มรูปใหม่ต่อท้าย
    // กันเคส "เพิ่มรูป 1 → รูปหอที่โชว์อยู่หายหมด" (เพราะเดิม base เป็น [] ทับด้วยรูปใหม่)
    const base = room.images.length ? room.images : room.dorm.images;
    const urls: string[] = [];
    for (const file of files ?? []) {
      const key = `rooms/${room.dormId}/${Date.now()}-${file.originalname}`;
      urls.push(await this.uploads.upload(key, file.buffer, file.mimetype, 'public'));
    }
    return this.prisma.room.update({ where: { id: roomId }, data: { images: [...base, ...urls] } });
  }

  async removeImage(ownerId: string, roomId: string, index: number) {
    const room = await this.assertOwnsRoom(ownerId, roomId);
    // materialize รูปหอก่อนถ้ายังไม่มีรูปของตัวเอง แล้วค่อยลบรูปตาม index (กันรูปหายยกชุด)
    const base = room.images.length ? room.images : room.dorm.images;
    const images = base.filter((_, i) => i !== index);
    return this.prisma.room.update({ where: { id: roomId }, data: { images } });
  }
}
