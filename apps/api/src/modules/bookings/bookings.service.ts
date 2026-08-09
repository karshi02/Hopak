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

    const rentalType = dto.rentalType ?? 'MONTHLY';
    const now = new Date();

    // เช่ารายวัน = คิดจำนวนคืน + กันจองซ้ำช่วงวัน แยก path ออกจากรายเดือน
    if (rentalType === 'DAILY') {
      return this.createDaily(tenantId, room, dto, now);
    }
    // เก็บค่าเช่า+มัดจำเป็น snapshot ตอนจอง (ราคาห้องอาจเปลี่ยนภายหลัง) — มัดจำใช้ระดับห้องก่อน
    // ถ้าห้องไม่ได้ตั้ง (0) ตกไปใช้ค่ามัดจำระดับหอ. ผู้เช่าจ่ายรวมกับเรา (กันจ่ายมัดจำตรงเจ้าของหอแล้วโดนโกง)
    // จ่ายเต็มสัญญาล่วงหน้า: ค่าเช่า = ราคา/เดือน × จำนวนเดือนที่เลือก (1/3/6) — มัดจำจ่ายครั้งเดียว
    const months = dto.leaseMonths ?? 1;
    const roomPrice = room.pricePerMonth * months;
    const deposit = room.deposit > 0 ? room.deposit : room.dorm.deposit;
    const booking = await this.prisma.booking.create({
      data: {
        tenantId,
        roomId: dto.roomId,
        checkInDate: new Date(dto.checkInDate),
        amount: roomPrice + deposit,
        roomPrice,
        deposit,
        leaseMonths: months,
        status: 'PENDING',
        contactName: dto.contactName,
        contactPhone: dto.contactPhone,
        note: dto.note,
        cancelDeadline: getCancelDeadline(now),
      },
    });
    this.realtime.emitToUser(room.dorm.ownerId, 'booking:new', booking);

    // แจ้งเตือนถาวรให้เจ้าของหอ (โผล่ในกระดิ่ง + หน้าแจ้งเตือน หมวด "การจอง") — เดิมมีแค่ socket ชั่วคราว
    const roomLabel = room.type === 'AIR' ? 'ห้องแอร์' : 'ห้องพัดลม';
    const checkIn = new Date(dto.checkInDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
    await this.notifications.create(
      room.dorm.ownerId,
      'booking',
      'มีการจองใหม่',
      `${dto.contactName} จอง${roomLabel} · เข้าอยู่ ${checkIn} · เช่า ${dto.leaseMonths ?? 1} เดือน — รอผู้เช่าชำระเงิน`,
    );

    return booking;
  }

  private static readonly MS_PER_DAY = 24 * 60 * 60 * 1000;

  // เช่ารายวัน: ตรวจว่าห้องเปิดรายวัน + คิดจำนวนคืน + กันจองซ้ำช่วงวันชนกัน
  // roomPrice = pricePerDay × nights (ฐานคิดค่าคอม), มัดจำ = 0 ตามนโยบายรายวัน
  private async createDaily(
    tenantId: string,
    room: { id: string; type: string; allowDaily: boolean; pricePerDay: number; dorm: { ownerId: string } },
    dto: CreateBookingDto,
    now: Date,
  ) {
    if (!room.allowDaily) throw new BadRequestException('ห้องนี้ไม่เปิดให้เช่ารายวัน');
    if (!dto.checkOutDate) throw new BadRequestException('กรุณาระบุวันคืนห้อง');

    const checkIn = new Date(dto.checkInDate);
    const checkOut = new Date(dto.checkOutDate);
    const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / BookingsService.MS_PER_DAY);
    if (nights < 1) {
      throw new BadRequestException('ต้องจองอย่างน้อย 1 คืน (วันคืนห้องต้องหลังวันเข้าพัก)');
    }

    // กันจองซ้ำ: หา booking รายวันอื่นของห้องนี้ที่ยังไม่ยกเลิก และช่วงวันทับซ้อนกัน
    // ทับซ้อนเมื่อ existing.checkIn < ใหม่.checkOut และ existing.checkOut > ใหม่.checkIn
    // (checkOut ถือเป็นวันออก ไม่นับคืน — จองต่อวันที่คนก่อนคืนห้องได้)
    const overlap = await this.prisma.booking.findFirst({
      where: {
        roomId: room.id,
        rentalType: 'DAILY',
        status: { not: 'CANCELLED' },
        checkInDate: { lt: checkOut },
        checkOutDate: { gt: checkIn },
      },
    });
    if (overlap) throw new BadRequestException('ช่วงวันที่เลือกถูกจองแล้ว กรุณาเลือกวันอื่น');

    const roomPrice = room.pricePerDay * nights;
    const deposit = 0;
    const booking = await this.prisma.booking.create({
      data: {
        tenantId,
        roomId: room.id,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        amount: roomPrice + deposit,
        roomPrice,
        deposit,
        rentalType: 'DAILY',
        nights,
        status: 'PENDING',
        contactName: dto.contactName,
        contactPhone: dto.contactPhone,
        note: dto.note,
        cancelDeadline: getCancelDeadline(now),
      },
    });
    this.realtime.emitToUser(room.dorm.ownerId, 'booking:new', booking);

    const roomLabel = room.type === 'AIR' ? 'ห้องแอร์' : 'ห้องพัดลม';
    const fmt = (d: Date) => d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
    await this.notifications.create(
      room.dorm.ownerId,
      'booking',
      'มีการจองรายวันใหม่',
      `${dto.contactName} จอง${roomLabel} รายวัน · ${fmt(checkIn)} - ${fmt(checkOut)} (${nights} คืน) — รอผู้เช่าชำระเงิน`,
    );

    return booking;
  }

  // ช่วงวันที่ถูกจองแล้วของห้อง (เฉพาะรายวันที่ยังไม่ยกเลิก) — ปฏิทินฝั่งผู้เช่าใช้ปิดวันที่เต็ม
  async bookedRanges(roomId: string) {
    const rows = await this.prisma.booking.findMany({
      where: { roomId, rentalType: 'DAILY', status: { not: 'CANCELLED' }, checkOutDate: { not: null } },
      select: { checkInDate: true, checkOutDate: true },
      orderBy: { checkInDate: 'asc' },
    });
    return rows.map((r) => ({ from: r.checkInDate, to: r.checkOutDate }));
  }

  listForTenant(tenantId: string) {
    return this.prisma.booking.findMany({
      where: { tenantId },
      include: { room: { include: { dorm: true } }, payment: { select: { status: true } } },
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
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      // include payment.status ด้วย — หน้า detail ต้องรู้ว่าผู้เช่าจ่าย/แนบสลิปแล้วหรือยัง
      // เพื่อโชว์ "รอแอดมินตรวจสลิป" (แทน confirmed+ปุ่มจ่ายซ้ำที่ดูเหมือนถอยกลับ)
      include: { room: { include: { dorm: true } }, payment: { select: { status: true } } },
    });
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

  // admin ยกเลิก/คืนห้อง booking ไหนก็ได้ (รวม PAID กรณีคืนเงิน) — override ไม่เช็ค state machine/
  // ownership/24h. คืนห้องกลับ AVAILABLE ให้โชว์ว่างบนเว็บทันที (การคืนเงินจริงแอดมินทำเบื้องหลัง)
  async adminCancel(id: string) {
    const booking = await this.findOne(id);
    const [updated] = await this.prisma.$transaction([
      this.prisma.booking.update({ where: { id }, data: { status: 'CANCELLED' } }),
      this.prisma.room.update({ where: { id: booking.roomId }, data: { status: 'AVAILABLE' } }),
    ]);
    this.realtime.emitToUser(booking.tenantId, 'booking:updated', updated);
    this.realtime.emitToUser(booking.room.dorm.ownerId, 'booking:updated', updated);
    await this.notifications.create(
      booking.tenantId,
      'booking',
      'การจองถูกยกเลิก',
      `การจอง ${booking.room.dorm.name} ถูกยกเลิกโดยแอดมิน หากชำระเงินไว้แล้ว ทีมงานจะติดต่อเรื่องการคืนเงิน`,
    );
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
