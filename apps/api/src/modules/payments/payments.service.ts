import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { calcCommission, calcOwnerPayout, calcChamberShare, calcPlatformShare } from '@hopak/shared';
import { PrismaService } from '../../prisma.service';
import { PromptPayGateway } from './gateway/promptpay.gateway';
import { UploadsService } from '../uploads/uploads.service';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private gateway: PromptPayGateway,
    private uploads: UploadsService,
  ) {}

  async pay(userId: string, bookingId: string, method: string, slip: Express.Multer.File) {
    if (!slip) throw new BadRequestException('กรุณาแนบสลิปโอนเงิน');

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    // เดิมไม่เช็คอะไรเลย ใครก็จ่าย/แนบสลิปทับ booking ของคนอื่นได้ + จ่าย booking ที่ยัง
    // PENDING ได้ (ข้ามการยืนยันของเจ้าของหอ) — คุม 3 อย่าง: เจ้าของ / สถานะ / จ่ายซ้ำ
    if (booking.tenantId !== userId) throw new ForbiddenException('ไม่ใช่การจองของคุณ');
    if (booking.status !== 'CONFIRMED') {
      throw new BadRequestException('ชำระเงินได้เฉพาะการจองที่เจ้าของหอยืนยันแล้วเท่านั้น');
    }
    if (booking.payment) throw new BadRequestException('การจองนี้มีการชำระเงินอยู่แล้ว');

    const result = await this.gateway.charge(booking.amount, method);

    // สลิปโอนเงินมีข้อมูลบัญชี/ธุรกรรมของลูกค้า — เก็บแบบ private เหมือนเอกสารยืนยันหอพัก ไม่มี URL ถาวรสาธารณะ
    const slipKey = `payments/${bookingId}/${Date.now()}-${slip.originalname}`;
    await this.uploads.upload(slipKey, slip.buffer, slip.mimetype, 'private');

    return this.prisma.payment.create({
      data: {
        bookingId,
        amount: booking.amount,
        commission: calcCommission(booking.amount),
        chamberShare: calcChamberShare(booking.amount),
        platformShare: calcPlatformShare(booking.amount),
        ownerPayout: calcOwnerPayout(booking.amount),
        method,
        status: result.success ? 'PENDING' : 'PENDING',
        slipKey,
      },
    });
  }
}
