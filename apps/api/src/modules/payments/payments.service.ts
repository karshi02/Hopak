import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { calcCommission, calcOwnerPayout, calcChamberShare, calcPlatformShare } from '@hopak/shared';
import { PrismaService } from '../../prisma.service';
import { PromptPayGateway } from './gateway/promptpay.gateway';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { UploadsService } from '../uploads/uploads.service';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private gateway: PromptPayGateway,
    private realtime: RealtimeGateway,
    private uploads: UploadsService,
  ) {}

  async pay(bookingId: string, method: string, slip: Express.Multer.File) {
    if (!slip) throw new BadRequestException('กรุณาแนบสลิปโอนเงิน');

    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');

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

  async settleDuePayments() {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);

    const due = await this.prisma.payment.findMany({ where: { status: 'PENDING' } });
    for (const payment of due) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'SETTLED', settledAt: new Date() },
      });
      const booking = await this.prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: 'PAID' },
      });
      this.realtime.emitToUser(booking.tenantId, 'booking:updated', booking);
    }
    return { settled: due.length };
  }
}
