import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma.service';
import { MailService } from '../../mail/mail.service';
import { UploadsService } from '../../uploads/uploads.service';

@Injectable()
export class ApprovalsService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private uploads: UploadsService,
  ) {}

  async listPending() {
    const dorms = await this.prisma.dorm.findMany({
      where: { status: 'PENDING_APPROVAL' },
      include: {
        owner: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    });

    // dorm.documents เก็บเป็น storage key (private) — แปลงเป็นลิงก์ชั่วคราวก่อนส่งให้แอดมิน
    return dorms.map((dorm) => ({
      ...dorm,
      documents: dorm.documents.map((key) => this.uploads.getPrivateUrl(key)),
    }));
  }

  private logAction(params: {
    entityType: 'DORM' | 'ROOM';
    entityId: string;
    action: string;
    adminId: string;
    snapshot?: unknown;
    note?: string;
  }) {
    return this.prisma.approvalLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        adminId: params.adminId,
        snapshot: params.snapshot as Prisma.InputJsonValue,
        note: params.note,
      },
    });
  }

  // ประวัติการอนุมัติ/ปฏิเสธ/แก้ไข/ระงับ ให้แอดมินตรวจสอบย้อนหลังได้ — กรองตามหอเดียวได้ถ้าส่ง entityId มา
  async listLog(entityId?: string) {
    return this.prisma.approvalLog.findMany({
      where: entityId ? { entityId } : undefined,
      include: { admin: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async approve(dormId: string, adminId: string) {
    const dorm = await this.prisma.dorm.update({
      where: { id: dormId },
      data: { status: 'APPROVED' },
      include: { owner: { select: { name: true, email: true } } },
    });

    await this.logAction({ entityType: 'DORM', entityId: dormId, action: 'APPROVED', adminId, snapshot: dorm });

    if (dorm.owner.email) {
      await this.mail.send(
        dorm.owner.email,
        'หอพักของคุณได้รับการอนุมัติแล้ว — Hopak Seller',
        `<p>สวัสดีคุณ ${dorm.owner.name},</p><p>หอพัก "${dorm.name}" ของคุณได้รับการอนุมัติแล้ว สามารถเข้าใช้งาน Owner Console เพื่อจัดการห้องพักและรับคำขอจองได้ทันที</p>`,
      );
    }

    return dorm;
  }

  async reject(dormId: string, adminId: string) {
    const dorm = await this.prisma.dorm.update({ where: { id: dormId }, data: { status: 'REJECTED' } });
    await this.logAction({ entityType: 'DORM', entityId: dormId, action: 'REJECTED', adminId, snapshot: dorm });
    return dorm;
  }

  // แอดมินระงับหอพัก (เผื่อเจ้าของหอทุจริต/มีปัญหา) — หอที่ถูกระงับหายจากหน้าค้นหาสาธารณะทันที (status ไม่ใช่ APPROVED)
  async suspendDorm(dormId: string, adminId: string, note?: string) {
    const dorm = await this.prisma.dorm.update({ where: { id: dormId }, data: { status: 'SUSPENDED' } });
    await this.logAction({ entityType: 'DORM', entityId: dormId, action: 'SUSPENDED', adminId, snapshot: dorm, note });
    return dorm;
  }

  async unsuspendDorm(dormId: string, adminId: string) {
    const dorm = await this.prisma.dorm.update({ where: { id: dormId }, data: { status: 'APPROVED' } });
    await this.logAction({ entityType: 'DORM', entityId: dormId, action: 'UNSUSPENDED', adminId, snapshot: dorm });
    return dorm;
  }

  // แอดมินแก้ข้อมูลหอพักได้ (เผื่อเจ้าของหอกรอกผิดตอนสมัคร) — ไม่เช็ค ownership เพราะแอดมินแก้แทนได้ทุกหอ
  async updateDorm(dormId: string, adminId: string, data: Record<string, unknown>) {
    const dorm = await this.prisma.dorm.findUnique({ where: { id: dormId } });
    if (!dorm) throw new NotFoundException('ไม่พบหอพัก');
    const updated = await this.prisma.dorm.update({ where: { id: dormId }, data });
    await this.logAction({ entityType: 'DORM', entityId: dormId, action: 'EDITED', adminId, snapshot: updated });
    return updated;
  }

  // แอดมินเพิ่ม/ลบรูปหอพักแทนเจ้าของหอได้ (เผื่อรูปผิด/ไม่เหมาะสมตอนตรวจสอบ)
  async addImages(dormId: string, adminId: string, files: Express.Multer.File[]) {
    const dorm = await this.prisma.dorm.findUnique({ where: { id: dormId } });
    if (!dorm) throw new NotFoundException('ไม่พบหอพัก');
    const urls: string[] = [];
    for (const file of files ?? []) {
      const key = `dorms/${dormId}/${Date.now()}-${file.originalname}`;
      urls.push(await this.uploads.upload(key, file.buffer, file.mimetype, 'public'));
    }
    const updated = await this.prisma.dorm.update({ where: { id: dormId }, data: { images: [...dorm.images, ...urls] } });
    await this.logAction({ entityType: 'DORM', entityId: dormId, action: 'EDITED', adminId, snapshot: updated });
    return updated;
  }

  async removeImage(dormId: string, adminId: string, index: number) {
    const dorm = await this.prisma.dorm.findUnique({ where: { id: dormId } });
    if (!dorm) throw new NotFoundException('ไม่พบหอพัก');
    const images = dorm.images.filter((_, i) => i !== index);
    const updated = await this.prisma.dorm.update({ where: { id: dormId }, data: { images } });
    await this.logAction({ entityType: 'DORM', entityId: dormId, action: 'EDITED', adminId, snapshot: updated });
    return updated;
  }

  // เปิด/ปิดให้ห้องใหม่ของหอนี้โชว์ผู้เช่าทันทีโดยไม่ต้องรอแอดมินตรวจทีละห้อง — แอดมินปรับได้ทุกเมื่อ
  setAutoApproveRooms(dormId: string, enabled: boolean) {
    return this.prisma.dorm.update({ where: { id: dormId }, data: { autoApproveRooms: enabled } });
  }

  // หอพักทั้งหมด (ทุกสถานะ) ให้แอดมินดูแล/แก้ไข/ตั้งค่า auto-approve ได้ต่อเนื่องหลังอนุมัติครั้งแรกไปแล้ว
  listAllDorms() {
    return this.prisma.dorm.findMany({
      include: { owner: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ห้องที่รอแอดมินตรวจสอบ (approved:false) ของทุกหอ
  listPendingRooms() {
    return this.prisma.room.findMany({
      where: { approved: false },
      include: { dorm: { include: { owner: { select: { id: true, name: true } } } } },
      orderBy: { id: 'desc' },
    });
  }

  // ห้องพักทั้งหมดของหอนี้ (ทุกสถานะ) ให้แอดมินดู/แก้ไขราคา-รายละเอียดได้ต่อเนื่องหลังอนุมัติแล้ว
  listRoomsForDorm(dormId: string) {
    return this.prisma.room.findMany({ where: { dormId }, orderBy: { id: 'desc' } });
  }

  async updateRoom(roomId: string, adminId: string, data: Record<string, unknown>) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('ไม่พบห้องพัก');
    const allowed = ['type', 'pricePerMonth', 'name', 'description', 'deposit', 'waterRate', 'electricRate', 'amenities'];
    const patch: Record<string, unknown> = {};
    for (const key of allowed) if (data[key] !== undefined) patch[key] = data[key];
    const updated = await this.prisma.room.update({ where: { id: roomId }, data: patch });
    await this.logAction({ entityType: 'ROOM', entityId: roomId, action: 'EDITED', adminId, snapshot: updated });
    return updated;
  }

  async addRoomImages(roomId: string, adminId: string, files: Express.Multer.File[]) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('ไม่พบห้องพัก');
    const urls: string[] = [];
    for (const file of files ?? []) {
      const key = `rooms/${room.dormId}/${Date.now()}-${file.originalname}`;
      urls.push(await this.uploads.upload(key, file.buffer, file.mimetype, 'public'));
    }
    const updated = await this.prisma.room.update({ where: { id: roomId }, data: { images: [...room.images, ...urls] } });
    await this.logAction({ entityType: 'ROOM', entityId: roomId, action: 'EDITED', adminId, snapshot: updated });
    return updated;
  }

  async removeRoomImage(roomId: string, adminId: string, index: number) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('ไม่พบห้องพัก');
    const images = room.images.filter((_, i) => i !== index);
    const updated = await this.prisma.room.update({ where: { id: roomId }, data: { images } });
    await this.logAction({ entityType: 'ROOM', entityId: roomId, action: 'EDITED', adminId, snapshot: updated });
    return updated;
  }

  async approveRoom(roomId: string, adminId: string) {
    const room = await this.prisma.room.update({ where: { id: roomId }, data: { approved: true } });
    await this.logAction({ entityType: 'ROOM', entityId: roomId, action: 'APPROVED', adminId, snapshot: room });
    return room;
  }

  // ปฏิเสธห้อง = ลบทิ้ง (ไม่มี field เก็บสถานะ "ถูกปฏิเสธ" แยก) — เก็บ snapshot เต็มลง ApprovalLog ก่อนลบเสมอ
  // เพื่อให้ตรวจสอบย้อนหลังได้ว่าห้องนี้เคยมีข้อมูลอะไรบ้างก่อนถูกปฏิเสธ
  async rejectRoom(roomId: string, adminId: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId }, include: { dorm: { select: { name: true } } } });
    if (!room) throw new NotFoundException('ไม่พบห้องพัก');
    await this.logAction({ entityType: 'ROOM', entityId: roomId, action: 'REJECTED', adminId, snapshot: room });
    await this.prisma.room.delete({ where: { id: roomId } });
    return { deleted: true };
  }
}
