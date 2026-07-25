import { Injectable } from '@nestjs/common';
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

  async approve(dormId: string) {
    const dorm = await this.prisma.dorm.update({
      where: { id: dormId },
      data: { status: 'APPROVED' },
      include: { owner: { select: { name: true, email: true } } },
    });

    if (dorm.owner.email) {
      await this.mail.send(
        dorm.owner.email,
        'หอพักของคุณได้รับการอนุมัติแล้ว — Hopak Seller',
        `<p>สวัสดีคุณ ${dorm.owner.name},</p><p>หอพัก "${dorm.name}" ของคุณได้รับการอนุมัติแล้ว สามารถเข้าใช้งาน Owner Console เพื่อจัดการห้องพักและรับคำขอจองได้ทันที</p>`,
      );
    }

    return dorm;
  }

  reject(dormId: string) {
    return this.prisma.dorm.update({ where: { id: dormId }, data: { status: 'REJECTED' } });
  }
}
