import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { getCancelDeadline, canCancel } from '@hopak/shared';
import { PrismaService } from '../../prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { assertTransition } from './booking-state.machine';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
  ) {}

  async create(tenantId: string, dto: CreateBookingDto) {
    const room = await this.prisma.room.findUnique({ where: { id: dto.roomId }, include: { dorm: true } });
    if (!room) throw new NotFoundException('Room not found');
    if (room.status !== 'AVAILABLE') throw new BadRequestException('Room not available');

    const now = new Date();
    const booking = await this.prisma.booking.create({
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
    this.realtime.emitToUser(room.dorm.ownerId, 'booking:new', booking);
    return booking;
  }

  listForTenant(tenantId: string) {
    return this.prisma.booking.findMany({ where: { tenantId }, include: { room: true } });
  }

  listForOwner(ownerId: string) {
    return this.prisma.booking.findMany({
      where: { room: { dorm: { ownerId } } },
      include: { room: { include: { dorm: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  listAll() {
    return this.prisma.booking.findMany({
      include: { room: { include: { dorm: true } } },
      orderBy: { createdAt: 'desc' },
    });
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
    const updated = await this.prisma.booking.update({ where: { id }, data: { status: 'CONFIRMED' } });
    this.realtime.emitToUser(booking.tenantId, 'booking:updated', updated);
    return updated;
  }

  async markPaid(id: string) {
    const booking = await this.findOne(id);
    assertTransition(booking.status.toLowerCase() as any, 'paid');
    await this.prisma.room.update({ where: { id: booking.roomId }, data: { status: 'OCCUPIED' } });
    return this.prisma.booking.update({ where: { id }, data: { status: 'PAID' } });
  }

  async reject(ownerId: string, id: string) {
    const booking = await this.findOne(id);
    if (booking.room.dorm.ownerId !== ownerId) throw new ForbiddenException('Not your dorm');
    assertTransition(booking.status.toLowerCase() as any, 'cancelled');
    const updated = await this.prisma.booking.update({ where: { id }, data: { status: 'CANCELLED' } });
    this.realtime.emitToUser(booking.tenantId, 'booking:updated', updated);
    return updated;
  }

  async cancel(tenantId: string, id: string) {
    const booking = await this.findOne(id);
    if (booking.tenantId !== tenantId) throw new ForbiddenException('Not your booking');
    assertTransition(booking.status.toLowerCase() as any, 'cancelled');
    if (!canCancel(booking.createdAt)) {
      throw new BadRequestException('Cancel window (24h) has passed');
    }
    const updated = await this.prisma.booking.update({ where: { id }, data: { status: 'CANCELLED' } });
    this.realtime.emitToUser(booking.room.dorm.ownerId, 'booking:updated', updated);
    return updated;
  }
}
