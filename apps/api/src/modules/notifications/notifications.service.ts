import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
  ) {}

  // ทุก notification ที่สร้างผ่านที่นี่ broadcast แบบเรียลไทม์ให้เจ้าของอัตโนมัติ
  // (warning, payout, หรือ type ใหม่ในอนาคต) — หน้าเว็บแค่ subscribe event เดียว 'notification:new'
  async create(userId: string, type: string, title: string, body: string) {
    const notification = await this.prisma.notification.create({ data: { userId, type, title, body } });
    this.realtime.emitToUser(userId, 'notification:new', notification);
    return notification;
  }

  listForUser(userId: string) {
    return this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  markRead(id: string) {
    return this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  }
}
