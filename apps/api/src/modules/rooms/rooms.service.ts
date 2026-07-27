import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

interface CreateRoomData {
  type: 'AIR' | 'FAN';
  pricePerMonth: number;
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

    const quantity = Math.max(1, Math.min(50, data.quantity ?? 1));
    const rows = Array.from({ length: quantity }, () => ({
      dormId,
      type: data.type,
      pricePerMonth: data.pricePerMonth,
      name: data.name,
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

  async setStatus(ownerId: string, roomId: string, status: 'AVAILABLE' | 'OCCUPIED') {
    const room = await this.prisma.room.findUnique({ where: { id: roomId }, include: { dorm: true } });
    if (!room) throw new NotFoundException('Room not found');
    if (room.dorm.ownerId !== ownerId) throw new ForbiddenException('Not your room');
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
    const urls: string[] = [];
    for (const file of files ?? []) {
      const key = `rooms/${room.dormId}/${Date.now()}-${file.originalname}`;
      urls.push(await this.uploads.upload(key, file.buffer, file.mimetype, 'public'));
    }
    return this.prisma.room.update({ where: { id: roomId }, data: { images: [...room.images, ...urls] } });
  }

  async removeImage(ownerId: string, roomId: string, index: number) {
    const room = await this.assertOwnsRoom(ownerId, roomId);
    const images = room.images.filter((_, i) => i !== index);
    return this.prisma.room.update({ where: { id: roomId }, data: { images } });
  }
}
