import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { UploadsService } from '../../uploads/uploads.service';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class OwnerRequestsService {
  constructor(
    private prisma: PrismaService,
    private uploads: UploadsService,
    private notifications: NotificationsService,
  ) {}

  // คืนคำขอทุกสถานะ (แอดมินกรอง/ค้นหาฝั่ง frontend) — pending ก่อน แล้วเรียงใหม่สุด
  async list() {
    const requests = await this.prisma.ownerRequest.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    // เอกสารเก็บเป็น storage key (private) — แปลงเป็นลิงก์ชั่วคราวก่อนส่งให้แอดมิน
    return requests.map((r) => ({ ...r, documents: r.documents.map((k) => this.uploads.getPrivateUrl(k)) }));
  }

  // สถิติที่ frontend คำนวณเองไม่ได้: จำนวนเจ้าของหอทั้งหมดในระบบ (รวมที่สมัครผ่านทางอื่นด้วย)
  async stats() {
    const totalOwners = await this.prisma.user.count({ where: { role: 'OWNER' } });
    return { totalOwners };
  }

  async approve(id: string) {
    const request = await this.prisma.ownerRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Request not found');

    await this.prisma.user.update({ where: { id: request.userId }, data: { role: 'OWNER' } });
    const updated = await this.prisma.ownerRequest.update({
      where: { id },
      data: { status: 'APPROVED', decidedAt: new Date() },
    });
    await this.notifications.create(
      request.userId,
      'owner',
      'อนุมัติเป็นเจ้าของหอแล้ว',
      `คำขอเปิดหอพัก "${request.dormName ?? ''}" ได้รับการอนุมัติ — เข้าคอนโซลเจ้าของหอเพื่อจัดการหอพักได้เลย`,
    );
    return updated;
  }

  async reject(id: string, reason?: string) {
    const request = await this.prisma.ownerRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Request not found');

    const updated = await this.prisma.ownerRequest.update({
      where: { id },
      data: { status: 'REJECTED', decidedAt: new Date() },
    });
    await this.notifications.create(
      request.userId,
      'owner',
      'คำขอเป็นเจ้าของหอไม่ผ่าน',
      reason?.trim()
        ? `คำขอเปิดหอพักไม่ผ่านการอนุมัติ: ${reason.trim()} — แก้ไขแล้วยื่นใหม่ได้`
        : 'คำขอเปิดหอพักไม่ผ่านการอนุมัติ กรุณาตรวจสอบเอกสารแล้วยื่นใหม่อีกครั้ง',
    );
    return updated;
  }
}
