import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma.service';
import { MailService } from '../mail/mail.service';
import { UploadsService } from '../uploads/uploads.service';
import { StartApplicationDto } from './dto/start-application.dto';
import { UpdateDormInfoDto } from './dto/update-dorm-info.dto';
import { FinishApplicationDto } from './dto/finish-application.dto';

const SALT_ROUNDS = 10;
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const SAFE_SELECT = {
  id: true,
  status: true,
  name: true,
  email: true,
  phone: true,
  dormName: true,
  address: true,
  province: true,
  lat: true,
  lng: true,
  waterRate: true,
  electricRate: true,
  deposit: true,
  note: true,
  images: true,
  documents: true,
  rooms: true,
  verifiedAt: true,
  otpSentAt: true,
  createdAt: true,
} as const;

@Injectable()
export class OwnerApplicationsService {
  private logger = new Logger(OwnerApplicationsService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private mail: MailService,
    private uploads: UploadsService,
  ) {}

  private async getOrThrow(id: string) {
    const app = await this.prisma.ownerApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('ไม่พบใบสมัคร');
    return app;
  }

  // documents ใน DB เก็บเป็น storage key (private) ไม่ใช่ URL ถาวร — ต้องแปลงเป็นลิงก์ชั่วคราวทุกครั้งก่อนส่งออก
  private withDocumentUrls<T extends { documents: string[] }>(app: T): T {
    return { ...app, documents: app.documents.map((key) => this.uploads.getPrivateUrl(key)) };
  }

  async findSafe(id: string) {
    const app = await this.prisma.ownerApplication.findUnique({ where: { id }, select: SAFE_SELECT });
    return app && this.withDocumentUrls(app);
  }

  async start(dto: StartApplicationDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, ...(dto.phone ? [{ phone: dto.phone }] : [])] },
    });
    if (existingUser) throw new ConflictException('อีเมลหรือเบอร์นี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ');

    const existing = await this.prisma.ownerApplication.findUnique({ where: { email: dto.email } });
    if (existing && existing.status === 'COMPLETED') {
      throw new ConflictException('อีเมลนี้สมัครเปิดหอพักไปแล้ว กรุณาเข้าสู่ระบบ');
    }

    // ใบสมัครเก่าที่ยังไม่เสร็จ (อีเมลเดิม กลับมากรอกใหม่) ต้องเริ่มรูป/เอกสาร/สถานะยืนยันเมลใหม่หมด
    // ห้ามพกข้อมูล/ไฟล์จากความพยายามครั้งก่อนมาโชว์ทับ — ไม่งั้นเหมือนเห็นรูปของใบสมัครอื่นที่ไม่เกี่ยวกัน
    const app = existing
      ? await this.prisma.ownerApplication.update({
          where: { id: existing.id },
          data: {
            name: dto.name,
            phone: dto.phone,
            images: [],
            documents: [],
            status: 'DRAFT',
            otpCodeHash: null,
            otpExpiresAt: null,
            otpSentAt: null,
            otpAttempts: 0,
            verifiedAt: null,
          },
          select: SAFE_SELECT,
        })
      : await this.prisma.ownerApplication.create({
          data: { name: dto.name, email: dto.email, phone: dto.phone },
          select: SAFE_SELECT,
        });
    return this.withDocumentUrls(app);
  }

  async updateDormInfo(id: string, dto: UpdateDormInfoDto) {
    const app = await this.getOrThrow(id);
    if (app.status === 'COMPLETED') throw new ForbiddenException('ใบสมัครนี้เสร็จสิ้นแล้ว');

    const updated = await this.prisma.ownerApplication.update({
      where: { id },
      data: {
        dormName: dto.dormName,
        address: dto.address,
        province: dto.province,
        lat: dto.lat,
        lng: dto.lng,
        note: dto.note,
      },
      select: SAFE_SELECT,
    });
    return this.withDocumentUrls(updated);
  }

  async addPhoto(id: string, file: Express.Multer.File) {
    const app = await this.getOrThrow(id);
    if (app.status === 'COMPLETED') throw new ForbiddenException('ใบสมัครนี้เสร็จสิ้นแล้ว');

    const key = `owner-applications/${id}/${Date.now()}-${file.originalname}`;
    const url = await this.uploads.upload(key, file.buffer, file.mimetype);

    const updated = await this.prisma.ownerApplication.update({
      where: { id },
      data: { images: { push: url } },
      select: SAFE_SELECT,
    });
    return this.withDocumentUrls(updated);
  }

  // ย้าย url ที่เลือกไปไว้ตำแหน่งแรกของ images[] — ตำแหน่งแรกคือรูปหน้าปกเสมอ
  async setCoverPhoto(id: string, url: string) {
    const app = await this.getOrThrow(id);
    if (app.status === 'COMPLETED') throw new ForbiddenException('ใบสมัครนี้เสร็จสิ้นแล้ว');
    if (!app.images.includes(url)) throw new BadRequestException('ไม่พบรูปนี้ในใบสมัคร');

    const reordered = [url, ...app.images.filter((img) => img !== url)];
    const updated = await this.prisma.ownerApplication.update({
      where: { id },
      data: { images: reordered },
      select: SAFE_SELECT,
    });
    return this.withDocumentUrls(updated);
  }

  async addDocument(id: string, file: Express.Multer.File) {
    const app = await this.getOrThrow(id);
    if (app.status === 'COMPLETED') throw new ForbiddenException('ใบสมัครนี้เสร็จสิ้นแล้ว');

    // เอกสารยืนยันตัวตน/หอพัก (บัตรประชาชน/โฉนด/ทะเบียนบ้าน) เก็บแบบ private เสมอ — ไม่มี URL ถาวรสาธารณะ
    const key = `owner-applications/${id}/docs/${Date.now()}-${file.originalname}`;
    await this.uploads.upload(key, file.buffer, file.mimetype, 'private');

    const updated = await this.prisma.ownerApplication.update({
      where: { id },
      data: { documents: { push: key } },
      select: SAFE_SELECT,
    });
    return this.withDocumentUrls(updated);
  }

  async sendOtp(id: string) {
    const app = await this.getOrThrow(id);
    if (app.status === 'COMPLETED') throw new ForbiddenException('ใบสมัครนี้เสร็จสิ้นแล้ว');
    if (app.otpSentAt && Date.now() - app.otpSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
      throw new BadRequestException('กรุณารอสักครู่ก่อนขอรหัสใหม่');
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const otpCodeHash = await bcrypt.hash(code, SALT_ROUNDS);
    const now = new Date();

    await this.prisma.ownerApplication.update({
      where: { id },
      data: { otpCodeHash, otpExpiresAt: new Date(now.getTime() + OTP_TTL_MS), otpSentAt: now, otpAttempts: 0 },
    });

    const sent = await this.mail.send(
      app.email,
      'รหัสยืนยันอีเมล Hoprak Seller',
      `<p>รหัสยืนยันอีเมลของคุณคือ</p><h2 style="letter-spacing:4px">${code}</h2><p>รหัสนี้หมดอายุใน 10 นาที</p>`,
    );
    if (!sent) this.logger.warn(`[DEV fallback] ส่งอีเมลไม่สำเร็จ — OTP สำหรับ ${app.email} คือ ${code}`);

    return { sent, email: app.email };
  }

  async verifyOtp(id: string, code: string) {
    const app = await this.getOrThrow(id);
    if (app.status === 'COMPLETED') throw new ForbiddenException('ใบสมัครนี้เสร็จสิ้นแล้ว');
    if (!app.otpCodeHash || !app.otpExpiresAt) throw new BadRequestException('กรุณาขอรหัส OTP ก่อน');
    if (app.otpExpiresAt.getTime() < Date.now()) throw new UnauthorizedException('รหัส OTP หมดอายุ กรุณาขอรหัสใหม่');
    if (app.otpAttempts >= OTP_MAX_ATTEMPTS) {
      throw new UnauthorizedException('กรอกผิดเกินจำนวนที่กำหนด กรุณาขอรหัสใหม่');
    }

    const valid = await bcrypt.compare(code, app.otpCodeHash);
    if (!valid) {
      await this.prisma.ownerApplication.update({ where: { id }, data: { otpAttempts: { increment: 1 } } });
      throw new UnauthorizedException('รหัส OTP ไม่ถูกต้อง');
    }

    const updated = await this.prisma.ownerApplication.update({
      where: { id },
      data: {
        status: 'EMAIL_VERIFIED',
        verifiedAt: new Date(),
        otpCodeHash: null,
        otpExpiresAt: null,
      },
      select: SAFE_SELECT,
    });
    return this.withDocumentUrls(updated);
  }

  async finish(id: string, dto: FinishApplicationDto) {
    const app = await this.getOrThrow(id);
    if (app.status !== 'EMAIL_VERIFIED') throw new ForbiddenException('กรุณายืนยันอีเมลก่อน');
    if (!app.dormName || !app.province || app.lat == null || app.lng == null) {
      throw new BadRequestException('กรุณากรอกข้อมูลหอพักให้ครบก่อน');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const rooms = (app.rooms as { type: 'AIR' | 'FAN'; pricePerMonth: number }[] | null) ?? [];

    try {
      const { accessToken } = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            role: 'OWNER',
            name: app.name ?? app.email,
            email: app.email,
            phone: app.phone,
            password: passwordHash,
          },
        });

        const dorm = await tx.dorm.create({
          data: {
            ownerId: user.id,
            name: app.dormName!,
            description: app.note ?? '',
            address: app.address,
            province: app.province!,
            lat: app.lat!,
            lng: app.lng!,
            waterRate: app.waterRate ?? 0,
            electricRate: app.electricRate ?? 0,
            deposit: app.deposit ?? 0,
            amenities: [],
            images: app.images,
            documents: app.documents,
          },
        });

        if (rooms.length) {
          await tx.room.createMany({
            data: rooms.map((r) => ({ dormId: dorm.id, type: r.type, pricePerMonth: r.pricePerMonth })),
          });
        }

        await tx.ownerApplication.update({ where: { id }, data: { status: 'COMPLETED' } });

        // ผูก session ให้เหมือน login ปกติ (jti ใหม่) — เพื่อให้โผล่ใน "อุปกรณ์ที่เข้าสู่ระบบ"
        // และเตะออกได้เหมือนบัญชีอื่นทุกทาง ไม่ใช่แค่ทาง auth.service ปกติ
        const jti = randomUUID();
        await tx.session.create({ data: { userId: user.id, jti } });

        return { accessToken: this.jwt.sign({ sub: user.id, role: user.role.toLowerCase(), jti }) };
      });

      return { accessToken };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('อีเมลหรือเบอร์นี้ถูกใช้งานแล้ว');
      }
      throw err;
    }
  }
}
