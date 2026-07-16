import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { getCancelDeadline, canCancel } from '@hopak/shared';
import { PrismaService } from '../../prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { assertTransition } from './booking-state.machine';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateBookingDto) {
    const room = await this.prisma.room.findUnique({ where: { id: dto.roomId } });
    if (!room) throw new NotFoundException('Room not found');
    if (room.status !== 'AVAILABLE') throw new BadRequestException('Room not available');

    const now = new Date();
    return this.prisma.booking.create({
      data: {
        tenantId,
        roomId: dto.roomId,
        checkInDate: new Date(dto.checkInDate),
        amount: room.pricePerMonth,
        status: 'PENDING',
        contactName: dto.contactName,
        contactPhone: dto.contactPhone,
        note: dto.note,
        cancelDeadline: getCancelDeadline(now),
      },
    });
  }

  listForTenant(tenantId: string) {
    return this.prisma.booking.findMany({ where: { tenantId }, include: { room: true } });
  }

  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id }, include: { room: { include: { dorm: true } } } });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async confirm(ownerId: string, id: string) {
    const booking = await this.findOne(id);
    if (booking.room.dorm.ownerId !== ownerId) throw new ForbiddenException('Not your dorm');
    assertTransition(booking.status.toLowerCase() as any, 'confirmed');
    return this.prisma.booking.update({ where: { id }, data: { status: 'CONFIRMED' } });
  }

  async markPaid(id: string) {
    const booking = await this.findOne(id);
    assertTransition(booking.status.toLowerCase() as any, 'paid');
    await this.prisma.room.update({ where: { id: booking.roomId }, data: { status: 'OCCUPIED' } });
    return this.prisma.booking.update({ where: { id }, data: { status: 'PAID' } });
  }

  async cancel(tenantId: string, id: string) {
    const booking = await this.findOne(id);
    if (booking.tenantId !== tenantId) throw new ForbiddenException('Not your booking');
    assertTransition(booking.status.toLowerCase() as any, 'cancelled');
    if (!canCancel(booking.createdAt)) {
      throw new BadRequestException('Cancel window (24h) has passed');
    }
    return this.prisma.booking.update({ where: { id }, data: { status: 'CANCELLED' } });
  }
}
