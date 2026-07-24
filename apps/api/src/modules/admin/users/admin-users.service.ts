import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { MailService } from '../../mail/mail.service';

@Injectable()
export class AdminUsersService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private mailService: MailService,
  ) {}

  async listAll() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        role: true,
        name: true,
        email: true,
        phone: true,
        suspended: true,
        createdAt: true,
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => ({ ...u, bookingCount: u._count.bookings, _count: undefined }));
  }

  async setSuspended(id: string, suspended: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'ADMIN') throw new ForbiddenException('ระงับบัญชีแอดมินไม่ได้');

    return this.prisma.user.update({
      where: { id },
      data: { suspended },
      select: { id: true, role: true, name: true, email: true, phone: true, suspended: true, createdAt: true },
    });
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { _count: { select: { bookings: true, dorms: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'ADMIN') throw new ForbiddenException('ลบบัญชีแอดมินไม่ได้');
    if (user._count.bookings > 0 || user._count.dorms > 0) {
      throw new ConflictException('ลบไม่ได้ เนื่องจากมีประวัติการจองหรือหอพักผูกอยู่ กรุณาระงับบัญชีแทน');
    }

    await this.prisma.$transaction([
      this.prisma.favorite.deleteMany({ where: { userId: id } }),
      this.prisma.notification.deleteMany({ where: { userId: id } }),
      this.prisma.ownerRequest.deleteMany({ where: { userId: id } }),
      this.prisma.review.deleteMany({ where: { tenantId: id } }),
      this.prisma.user.delete({ where: { id } }),
    ]);
    return { success: true };
  }

  async sendWarning(id: string, title: string, message: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    await this.notificationsService.create(id, 'warning', title, message);

    let emailSent = false;
    if (user.email) {
      emailSent = await this.mailService.send(
        user.email,
        `[Hopak] ${title}`,
        `<p>เรียน ${user.name}</p><p>${message}</p><p>— ทีมงาน Hopak</p>`,
      );
    }

    return { notified: true, emailSent };
  }
}
