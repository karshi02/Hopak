import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { UploadsService } from '../uploads/uploads.service';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
    private uploads: UploadsService,
  ) {}

  // ทุก notification ที่สร้างผ่านที่นี่ broadcast แบบเรียลไทม์ให้เจ้าของอัตโนมัติ
  // (warning, payout, หรือ type ใหม่ในอนาคต) — หน้าเว็บแค่ subscribe event เดียว 'notification:new'
  // attachmentKey ใส่ได้เผื่อแนบไฟล์ (เช่น สลิปโอนเงิน payout) — เก็บแค่ storage key ไม่ใช่ URL ถาวร
  async create(userId: string, type: string, title: string, body: string, attachmentKey?: string) {
    const notification = await this.prisma.notification.create({
      data: { userId, type, title, body, attachmentKey },
    });
    this.realtime.emitToUser(userId, 'notification:new', notification);
    return notification;
  }

  listForUser(userId: string) {
    return this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  // mark ทุกรายการที่ยังไม่อ่านของ user เป็นอ่านแล้วทีเดียว (ปุ่ม "อ่านทั้งหมดแล้ว")
  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  // เช็ค ownership ก่อน mark ทุกครั้ง กัน user เดา id ของคนอื่นมา mark แทน (บั๊ก [26] เดิม)
  async markRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException('ไม่พบการแจ้งเตือน');
    if (notification.userId !== userId) throw new ForbiddenException('ไม่ใช่การแจ้งเตือนของคุณ');
    return this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  }

  // สร้าง signed URL ใหม่ทุกครั้งที่ขอดู (ไม่ cache URL ถาวร) — เช็คด้วยว่า notification นี้เป็นของ user ที่ล็อกอินอยู่จริง
  async getAttachmentUrl(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException('ไม่พบการแจ้งเตือน');
    if (notification.userId !== userId) throw new ForbiddenException('ไม่ใช่การแจ้งเตือนของคุณ');
    if (!notification.attachmentKey) throw new NotFoundException('การแจ้งเตือนนี้ไม่มีไฟล์แนบ');
    return { url: this.uploads.getPrivateUrl(notification.attachmentKey) };
  }
}
