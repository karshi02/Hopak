import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  create(userId: string, type: string, title: string, body: string) {
    return this.prisma.notification.create({ data: { userId, type, title, body } });
  }

  listForUser(userId: string) {
    return this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  markRead(id: string) {
    return this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  }
}
