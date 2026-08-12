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
import { createHash, randomBytes, randomUUID } from 'crypto';
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
// จำกัดจำนวนไฟล์ต่อใบสมัคร — กัน storage abuse เมื่อ secret หลุด
const MAX_DOCUMENTS = 10;
const MAX_PHOTOS = 15;

// เก็บเฉพาะ sha256 ของ continuation secret (ตัวจริงส่งให้ผู้สมัครครั้งเดียวตอน start)
function hashSecret(secret: string) {
  return createHash('sha256').update(secret).digest('hex');
}

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

  // id ของใบสมัครเดาได้/ส่งต่อกันได้ จึงไม่นับเป็นหลักฐานความเป็นเจ้าของ
  // ทุก route ที่แตะใบสมัครต้องแนบ continuation secret ที่ออกให้ตอน start เท่านั้น
  private async getOrThrow(id: string, secret?: string) {
    const app = await this.prisma.ownerApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('ไม่พบใบสมัคร');
    if (app.secretHash) {
      if (!secret || hashSecret(secret) !== app.secretHash) {
        throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงใบสมัครนี้');
      }
    }
    return app;
  }

  // documents ใน DB เก็บเป็น storage key (private) ไม่ใช่ URL ถาวร — ต้องแปลงเป็นลิงก์ชั่วคราวทุกครั้งก่อนส่งออก
  private withDocumentUrls<T extends { documents: string[] }>(app: T): T {
    return { ...app, documents: app.documents.map((key) => this.uploads.getPrivateUrl(key)) };
  }

  async findSafe(id: string, secret?: string) {
    // ต้องผ่าน getOrThrow ก่อน — ไม่งั้นรู้แค่ id ก็อ่าน PII ของใบสมัครคนอื่นได้
    await this.getOrThrow(id, secret);
    const app = await this.prisma.ownerApplication.findUnique({ where: { id }, select: SAFE_SELECT });
    return app && this.withDocumentUrls(app);
  }

  async start(dto: StartApplicationDto) {
    // เช็คเฉพาะบัญชี "เจ้าของหอ" — คนที่มีบัญชีผู้เช่าอยู่แล้วสมัครเปิดหอเพิ่มได้
    // (บัญชีสองฝั่งแยกขาดกัน อีเมลเดียวกันมีได้ทั้งผู้เช่าและเจ้าของหอ)
    const existingOwner = await this.prisma.user.findFirst({
      where: {
        role: 'OWNER',
        OR: [{ email: dto.email }, ...(dto.phone ? [{ phone: dto.phone }] : [])],
      },
    });
    if (existingOwner) {
      throw new ConflictException('อีเมลหรือเบอร์นี้มีบัญชีเจ้าของหออยู่แล้ว กรุณาเข้าสู่ระบบเจ้าของหอ');
    }

    const existing = await this.prisma.ownerApplication.findUnique({ where: { email: dto.email } });
    if (existing && existing.status === 'COMPLETED') {
      throw new ConflictException('อีเมลนี้สมัครเปิดหอพักไปแล้ว กรุณาเข้าสู่ระบบ');
    }

    // ใบสมัครเก่าที่ยังไม่เสร็จ (อีเมลเดิม กลับมากรอกใหม่) ต้องเริ่มรูป/เอกสาร/สถานะยืนยันเมลใหม่หมด
    // ห้ามพกข้อมูล/ไฟล์จากความพยายามครั้งก่อนมาโชว์ทับ — ไม่งั้นเหมือนเห็นรูปของใบสมัครอื่นที่ไม่เกี่ยวกัน
    // continuation secret ใหม่ทุกครั้งที่เริ่ม/เริ่มใหม่ — secret เก่าใช้ไม่ได้ทันที
    const secret = randomBytes(32).toString('hex');
    const secretHash = hashSecret(secret);

    const app = existing
      ? await this.prisma.ownerApplication.update({
          where: { id: existing.id },
          data: {
            name: dto.name,
            phone: dto.phone,
            // ล้าง draft ทั้งหมด ไม่ให้ข้อมูล/ไฟล์จากความพยายามครั้งก่อนตกไปถึงคนที่เริ่มใหม่
            dormName: null,
            address: null,
            province: null,
            lat: null,
            lng: null,
            waterRate: null,
            electricRate: null,
            deposit: null,
            note: null,
            rooms: Prisma.DbNull,
            images: [],
            documents: [],
            status: 'DRAFT',
            otpCodeHash: null,
            otpExpiresAt: null,
            otpSentAt: null,
            otpAttempts: 0,
            verifiedAt: null,
            secretHash,
            verifiedSecretHash: null,
          },
          select: { id: true, status: true, email: true },
        })
      : await this.prisma.ownerApplication.create({
          data: { name: dto.name, email: dto.email, phone: dto.phone, secretHash },
          select: { id: true, status: true, email: true },
        });

    // คืนเฉพาะสิ่งที่จำเป็น + secret (ครั้งเดียว) — ไม่คืน PII ของใบสมัคร
    // เพราะแค่รู้อีเมลของคนอื่นก็เรียก endpoint นี้ได้ ถ้าคืน draft กลับไปจะกลายเป็นช่องอ่านข้อมูลคนอื่น
    return { id: app.id, status: app.status, email: app.email, secret };
  }

  async updateDormInfo(id: string, secret: string | undefined, dto: UpdateDormInfoDto) {
    const app = await this.getOrThrow(id, secret);
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

  async addPhoto(id: string, secret: string | undefined, file: Express.Multer.File) {
    const app = await this.getOrThrow(id, secret);
    if (app.status === 'COMPLETED') throw new ForbiddenException('ใบสมัครนี้เสร็จสิ้นแล้ว');
    if (app.images.length >= MAX_PHOTOS) throw new BadRequestException(`อัปโหลดรูปได้สูงสุด ${MAX_PHOTOS} รูป`);

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
  async setCoverPhoto(id: string, secret: string | undefined, url: string) {
    const app = await this.getOrThrow(id, secret);
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

  async addDocument(id: string, secret: string | undefined, file: Express.Multer.File) {
    const app = await this.getOrThrow(id, secret);
    if (app.status === 'COMPLETED') throw new ForbiddenException('ใบสมัครนี้เสร็จสิ้นแล้ว');
    if (app.documents.length >= MAX_DOCUMENTS) throw new BadRequestException(`แนบเอกสารได้สูงสุด ${MAX_DOCUMENTS} ไฟล์`);

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

  async sendOtp(id: string, secret?: string) {
    const app = await this.getOrThrow(id, secret);
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

  async verifyOtp(id: string, code: string, secret?: string) {
    const app = await this.getOrThrow(id, secret);
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
        // ผูกผลการยืนยันไว้กับ secret ตัวที่ยืนยัน — คนอื่นที่ถือ secret คนละตัวจะ finish ต่อไม่ได้
        verifiedSecretHash: app.secretHash,
      },
      select: SAFE_SELECT,
    });
    return this.withDocumentUrls(updated);
  }

  async finish(id: string, dto: FinishApplicationDto, secret?: string) {
    const app = await this.getOrThrow(id, secret);
    if (app.status !== 'EMAIL_VERIFIED') throw new ForbiddenException('กรุณายืนยันอีเมลก่อน');
    // ต้องเป็น secret ตัวเดียวกับที่ยืนยัน OTP สำเร็จเท่านั้น
    // (กันเคสแข่งกด finish หลังเจ้าตัวยืนยันอีเมลแล้ว โดยใช้ใบสมัครใบเดียวกัน)
    if (!app.verifiedSecretHash || app.verifiedSecretHash !== app.secretHash) {
      throw new ForbiddenException('กรุณายืนยันอีเมลใหม่อีกครั้ง');
    }
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
        // unique เป็นคู่ (email, role) แล้ว — ชนแปลว่ามีบัญชี "เจ้าของหอ" ด้วยอีเมลนี้อยู่ก่อน
        // (บัญชีผู้เช่าอีเมลเดียวกันไม่ชน สมัครเปิดหอเพิ่มได้ตามปกติ)
        throw new ConflictException('อีเมลหรือเบอร์นี้มีบัญชีเจ้าของหออยู่แล้ว — เข้าสู่ระบบเจ้าของหอได้เลย');
      }
      throw err;
    }
  }
}
