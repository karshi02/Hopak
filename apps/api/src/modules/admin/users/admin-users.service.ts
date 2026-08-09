import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { MailService } from '../../mail/mail.service';
import { UploadsService } from '../../uploads/uploads.service';
import { CreateUserDto } from './dto/create-user.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class AdminUsersService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private mailService: MailService,
    private uploads: UploadsService,
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

  private sessionPeriodRange(year?: number, month?: number) {
    if (!year) return undefined;
    // month = 1-12 (frontend ส่งมาแบบนี้) — Date เดือนใน JS เริ่มที่ 0
    if (month) return { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) };
    return { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) };
  }

  // เดือน/ปีที่มีประวัติการเข้าสู่ระบบจริง — ใช้ทำ dropdown เลือกดูย้อนหลังทีละเดือน
  async sessionPeriods() {
    const sessions = await this.prisma.session.findMany({
      where: { user: { role: { in: ['OWNER', 'ADMIN'] } } },
      select: { createdAt: true },
    });
    const set = new Set(sessions.map((s) => `${s.createdAt.getFullYear()}-${s.createdAt.getMonth() + 1}`));
    return Array.from(set)
      .map((key) => {
        const [year, month] = key.split('-').map(Number);
        return { year, month };
      })
      .sort((a, b) => b.year - a.year || b.month - a.month);
  }

  // ประวัติการเข้าสู่ระบบทั้งระบบ — ทุก Session ที่เคยสร้าง (login ครั้งไหน จาก IP ไหน บราวเซอร์อะไร
  // ใช้งานล่าสุดเมื่อไหร่ ยัง active หรือถูกเตะออกแล้ว) เรียงใหม่สุดก่อน
  // ไม่เลือกเดือน = 200 รายการล่าสุดทั้งหมด · เลือกเดือน = ทุกรายการของเดือนนั้น (ดูย้อนหลัง)
  async listSessions(year?: number, month?: number) {
    const createdAt = this.sessionPeriodRange(year, month);
    // โชว์เฉพาะ session ของเจ้าของหอ + แอดมิน — ผู้เช่า (tenant) ไม่เกี่ยวกับการตรวจสอบฝั่งจัดการ
    const sessions = await this.prisma.session.findMany({
      where: {
        user: { role: { in: ['OWNER', 'ADMIN'] } },
        ...(createdAt ? { createdAt } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: createdAt ? 1000 : 200,
      include: { user: { select: { name: true, email: true, phone: true, role: true } } },
    });
    return sessions.map((s) => ({
      id: s.id,
      userName: s.user.name,
      userEmail: s.user.email,
      userPhone: s.user.phone,
      role: s.user.role,
      ip: s.ip,
      userAgent: s.userAgent,
      loginAt: s.createdAt,
      lastSeenAt: s.lastSeenAt,
      active: !s.revokedAt,
      revokedAt: s.revokedAt,
    }));
  }

  async setSuspended(id: string, suspended: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'ADMIN') throw new ForbiddenException('ระงับบัญชีแอดมินไม่ได้');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { suspended },
      select: { id: true, role: true, name: true, email: true, phone: true, suspended: true, createdAt: true },
    });

    // ระงับบัญชี = เตะออกจากทุกอุปกรณ์ทันที (revoke session) ไม่ให้ token เดิมใช้งานต่อจนหมดอายุเอง
    if (suspended) {
      await this.prisma.session.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return updated;
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

  // แอดมินสร้างบัญชีผู้ใช้ให้เองโดยตรง (ไม่ต้องรอสมัคร/อนุมัติ) — สร้างแค่บัญชี User เท่านั้น
  // ถ้าเป็นเจ้าของหอ (OWNER) ยังต้องเข้าไปยื่นข้อมูลหอพักผ่านขั้นตอนปกติต่อเอง
  async create(dto: CreateUserDto) {
    if (!dto.email && !dto.phone) throw new BadRequestException('ต้องกรอกอีเมลหรือเบอร์โทรอย่างน้อยหนึ่งอย่าง');

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    try {
      return await this.prisma.user.create({
        data: {
          role: dto.role,
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          password: passwordHash,
        },
        select: { id: true, role: true, name: true, email: true, phone: true, suspended: true, createdAt: true },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const target = (err.meta?.target as string[] | undefined) ?? [];
        if (target.includes('email')) throw new ConflictException('อีเมลนี้ถูกใช้งานแล้ว');
        if (target.includes('phone')) throw new ConflictException('เบอร์โทรนี้ถูกใช้งานแล้ว');
        throw new ConflictException('ข้อมูลนี้ถูกใช้งานแล้ว');
      }
      throw err;
    }
  }

  // เอกสารแนบทั้งหมดของเจ้าของหอคนนี้ — ให้แอดมินตรวจสอบย้อนหลังได้ตลอด กันทุจริต
  // แยกเป็น 2 ระดับ: เอกสารระดับบัญชี (accountDocuments — แนบตอนแอดมินสร้างบัญชีให้ หรือเพิ่ม/เปลี่ยนทีหลังได้)
  // กับเอกสารระดับหอพัก (dorms[].documents — แนบตอนยื่นสมัครหอพักแต่ละหอ)
  async listOwnerDocuments(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { documents: true } });
    if (!user) throw new NotFoundException('User not found');

    const dorms = await this.prisma.dorm.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, documents: true },
    });
    return {
      accountDocuments: user.documents.map((key) => this.uploads.getPrivateUrl(key)),
      dorms: dorms.map((dorm) => ({
        dormId: dorm.id,
        dormName: dorm.name,
        documents: dorm.documents.map((key) => this.uploads.getPrivateUrl(key)),
      })),
    };
  }

  // แอดมินเพิ่มเอกสารระดับบัญชีให้ผู้ใช้ได้ตลอด (ตอนสร้างบัญชีหรือเพิ่ม/เปลี่ยนทีหลังก็ได้)
  async addDocuments(userId: string, files: Express.Multer.File[]) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const keys: string[] = [];
    for (const file of files ?? []) {
      const key = `users/${userId}/docs/${Date.now()}-${file.originalname}`;
      await this.uploads.upload(key, file.buffer, file.mimetype, 'private');
      keys.push(key);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { documents: [...user.documents, ...keys] },
      select: { id: true, documents: true },
    });
  }

  async removeDocument(userId: string, index: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const documents = user.documents.filter((_, i) => i !== index);
    return this.prisma.user.update({ where: { id: userId }, data: { documents }, select: { id: true, documents: true } });
  }

  async sendWarning(id: string, title: string, message: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    await this.notificationsService.create(id, 'warning', title, message);

    let emailSent = false;
    if (user.email) {
      emailSent = await this.mailService.send(
        user.email,
        `[Hoprak] ${title}`,
        `<p>เรียน ${user.name}</p><p>${message}</p><p>— ทีมงาน Hoprak</p>`,
      );
    }

    return { notified: true, emailSent };
  }
}
