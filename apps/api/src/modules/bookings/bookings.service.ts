import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { getCancelDeadline, canCancel } from '@hopak/shared';
import { PrismaService } from '../../prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { assertTransition } from './booking-state.machine';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { randomInt } from 'crypto';

// ตัด I O 0 1 ออก — โค้ดนี้คนต้องอ่านจากจอแล้วพิมพ์/บอกปากเปล่ากันหน้าเคาน์เตอร์
const TOKEN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
// เผื่อเวลาให้ผู้เช่าที่เข้าพักช้ากว่าวันที่จองไว้ ไม่ให้โค้ดตายตั้งแต่เลยเที่ยงคืนวันแรก
const CHECK_IN_GRACE_DAYS = 7;

function randomTokenBlock(len: number) {
  let out = '';
  for (let i = 0; i < len; i += 1) out += TOKEN_ALPHABET[randomInt(TOKEN_ALPHABET.length)];
  return out;
}

export function generateCheckInToken() {
  return `HPK-${randomTokenBlock(4)}-${randomTokenBlock(4)}`;
}

export function checkInTokenExpiry(checkInDate: Date) {
  const end = new Date(checkInDate);
  end.setDate(end.getDate() + CHECK_IN_GRACE_DAYS);
  end.setHours(23, 59, 59, 999);
  return end;
}

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
    private notifications: NotificationsService,
  ) {}

  async create(tenantId: string, dto: CreateBookingDto) {
    const room = await this.prisma.room.findUnique({ where: { id: dto.roomId }, include: { dorm: true } });
    if (!room) throw new NotFoundException('Room not found');
    if (room.status !== 'AVAILABLE') throw new BadRequestException('Room not available');
    // เจ้าของหอจองห้องของตัวเองไม่ได้ (นอกจาก RolesGuard ที่กัน role owner อยู่แล้ว
    // ยังกันเคสขอบ เช่น บัญชีที่เปลี่ยน role ภายหลัง หรือถูกเรียกจากที่อื่น)
    if (room.dorm.ownerId === tenantId) {
      throw new BadRequestException('เจ้าของหอไม่สามารถจองห้องของตัวเองได้');
    }

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
    return this.prisma.booking.findMany({
      where: { tenantId },
      include: { room: { include: { dorm: true } } },
      orderBy: { createdAt: 'desc' },
    });
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

  // เวอร์ชันที่เปิดให้ผู้ใช้เรียกตรงๆ ผ่าน API — findOne() ด้านบนเป็นตัวภายในที่ service อื่นใช้ต่อ
  // เดิม endpoint GET /bookings/:id เรียก findOne() ตรงๆ โดยไม่เช็คอะไรเลย ใครล็อกอินก็อ่าน
  // การจองของคนอื่นได้หมด (ชื่อ เบอร์โทร ยอดเงิน) — ยิ่งตอนนี้มี checkInToken อยู่ในนั้นด้วย
  async findOneFor(id: string, user: { id: string; role: string }) {
    const booking = await this.findOne(id);
    const role = user.role.toLowerCase();
    const isTenant = booking.tenantId === user.id;
    const isDormOwner = booking.room.dorm.ownerId === user.id;
    if (role !== 'admin' && !isTenant && !isDormOwner) throw new ForbiddenException('Not your booking');

    // โทเค็นเข้าพักเป็นของผู้เช่าเท่านั้น เจ้าของหอ/แอดมินต้องให้ผู้เช่าแสดงโค้ดให้ดูเอง
    // ถ้าเจ้าของหออ่านโค้ดเองได้จากระบบ การ "ยืนยันตัวตนตอนเข้าพัก" ก็ไม่เหลือความหมาย
    if (!isTenant) {
      const { checkInToken: _t, checkInTokenExpiresAt: _e, ...rest } = booking;
      return rest;
    }
    return booking;
  }

  async confirm(ownerId: string, id: string) {
    const booking = await this.findOne(id);
    if (booking.room.dorm.ownerId !== ownerId) throw new ForbiddenException('Not your dorm');
    assertTransition(booking.status.toLowerCase() as any, 'confirmed');
    const updated = await this.prisma.booking.update({ where: { id }, data: { status: 'CONFIRMED' } });
    this.realtime.emitToUser(booking.tenantId, 'booking:updated', updated);
    await this.notifications.create(
      booking.tenantId,
      'booking',
      'เจ้าของหอยืนยันการจองแล้ว',
      `การจอง ${booking.room.dorm.name} ได้รับการยืนยันแล้ว ดำเนินการชำระเงินต่อได้เลย`,
    );
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
    await this.notifications.create(
      booking.tenantId,
      'booking',
      'เจ้าของหอไม่รับการจอง',
      `การจอง ${booking.room.dorm.name} ไม่ได้รับการยืนยัน คำขอสิ้นสุดแล้ว คุณสามารถเลือกจองหอพักอื่นได้`,
    );
    return updated;
  }

  // admin ยกเลิก booking ไหนก็ได้ ไม่เช็ค ownership และไม่เช็ค 24h window (คนละสิทธิ์กับ cancel ของผู้เช่า)
  async adminCancel(id: string) {
    const booking = await this.findOne(id);
    assertTransition(booking.status.toLowerCase() as any, 'cancelled');
    const updated = await this.prisma.booking.update({ where: { id }, data: { status: 'CANCELLED' } });
    this.realtime.emitToUser(booking.tenantId, 'booking:updated', updated);
    this.realtime.emitToUser(booking.room.dorm.ownerId, 'booking:updated', updated);
    return updated;
  }

  // กู้คืน booking ที่ถูกยกเลิกกลับมาเป็น pending (เผื่อลูกค้าเปลี่ยนใจ) — คนละกรณีกับ ALLOWED_TRANSITIONS
  // ปกติเพราะ cancelled เป็น terminal state ตาม state machine ทั่วไป จึงเช็ค/เปลี่ยนสถานะเองตรงนี้แทน assertTransition
  async adminRestore(id: string) {
    const booking = await this.findOne(id);
    if (booking.status !== 'CANCELLED') {
      throw new BadRequestException('กู้คืนได้เฉพาะ booking ที่ถูกยกเลิกแล้วเท่านั้น');
    }
    const updated = await this.prisma.booking.update({ where: { id }, data: { status: 'PENDING' } });
    this.realtime.emitToUser(booking.tenantId, 'booking:updated', updated);
    this.realtime.emitToUser(booking.room.dorm.ownerId, 'booking:updated', updated);
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

  // เจ้าของหอกรอกโค้ดที่ผู้เช่าแสดงให้ดูตอนมาถึงหอจริง → ปิดงานเป็น COMPLETED
  // ไม่รับ bookingId เพราะจุดประสงค์คือให้ "โค้ด" เป็นตัวพิสูจน์ ไม่ใช่ให้เจ้าของหอเลือกเองว่าจะปิดอันไหน
  async checkIn(ownerId: string, rawToken: string) {
    const token = rawToken.trim().toUpperCase();
    if (!token) throw new BadRequestException('กรุณากรอกโค้ดยืนยันการเข้าพัก');

    const booking = await this.prisma.booking.findUnique({
      where: { checkInToken: token },
      include: { room: { include: { dorm: true } } },
    });
    // ข้อความเดียวกันทั้งกรณีโค้ดไม่มีจริงและกรณีเป็นโค้ดของหออื่น — กันเจ้าของหอสุ่มโค้ด
    // แล้วอ่านจากข้อความ error ได้ว่าโค้ดไหนมีอยู่จริงในระบบบ้าง
    if (!booking || booking.room.dorm.ownerId !== ownerId) {
      throw new NotFoundException('ไม่พบโค้ดนี้ในหอพักของคุณ กรุณาตรวจสอบอีกครั้ง');
    }
    if (booking.checkedInAt) throw new BadRequestException('โค้ดนี้ถูกใช้ยืนยันการเข้าพักไปแล้ว');
    if (booking.status !== 'PAID') throw new BadRequestException('การจองนี้ยังไม่อยู่ในสถานะชำระเงินแล้ว');
    if (booking.checkInTokenExpiresAt && booking.checkInTokenExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('โค้ดนี้หมดอายุแล้ว กรุณาติดต่อแอดมิน');
    }

    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'COMPLETED', checkedInAt: new Date() },
    });
    this.realtime.emitToUser(booking.tenantId, 'booking:updated', updated);

    return {
      bookingId: booking.id,
      tenantName: booking.contactName,
      tenantPhone: booking.contactPhone,
      dormName: booking.room.dorm.name,
      roomName: booking.room.name,
      roomType: booking.room.type,
      checkInDate: booking.checkInDate,
      amount: booking.amount,
      checkedInAt: updated.checkedInAt,
    };
  }
}
