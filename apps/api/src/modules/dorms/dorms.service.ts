import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateDormDto } from './dto/create-dorm.dto';
import { UpdateDormDto } from './dto/update-dorm.dto';
import { SearchQueryDto } from './dto/search-query.dto';
import { ReviewsService } from '../reviews/reviews.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { UploadsService } from '../uploads/uploads.service';

@Injectable()
export class DormsService {
  constructor(
    private prisma: PrismaService,
    private reviewsService: ReviewsService,
    private realtime: RealtimeGateway,
    private uploads: UploadsService,
  ) {}

  async search(query: SearchQueryDto) {
    const dorms = await this.prisma.dorm.findMany({
      where: {
        status: 'APPROVED',
        province: query.province,
        university: query.university,
        ...(query.q
          ? {
              OR: [
                { name: { contains: query.q, mode: 'insensitive' as const } },
                { province: { contains: query.q, mode: 'insensitive' as const } },
                { university: { contains: query.q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      // ห้องที่ยังไม่ผ่านตรวจ (approved:false) ไม่โชว์ในหน้าค้นหาสาธารณะ
      include: { rooms: { where: { approved: true } } },
    });
    const ratings = await this.reviewsService.summaryForDorms(dorms.map((d) => d.id));
    return dorms.map((d) => ({ ...d, ...ratings.get(d.id) }));
  }

  async findOne(id: string) {
    const dorm = await this.prisma.dorm.findUniqueOrThrow({
      where: { id },
      include: { rooms: { where: { approved: true } }, owner: { select: { name: true } } },
    });
    const ratings = await this.reviewsService.summaryForDorms([id]);
    // ห้องไม่มีรูปเฉพาะ → ใช้รูปหอ (เรียลไทม์ ไม่ก็อป) เจ้าของเปลี่ยนรูปหอ ห้องอัปเดตตาม
    const rooms = dorm.rooms.map((r) => ({ ...r, images: r.images.length ? r.images : dorm.images }));
    return { ...dorm, rooms, ...ratings.get(id) };
  }

  async listMine(ownerId: string) {
    const dorms = await this.prisma.dorm.findMany({
      where: { ownerId },
      include: { rooms: true },
      orderBy: { createdAt: 'desc' },
    });
    const ratings = await this.reviewsService.summaryForDorms(dorms.map((d) => d.id));
    return dorms.map((d) => ({ ...d, ...ratings.get(d.id) }));
  }

  async create(ownerId: string, dto: CreateDormDto) {
    const dorm = await this.prisma.dorm.create({
      data: { ...dto, ownerId, status: 'PENDING_APPROVAL' },
    });
    this.realtime.emitToRole('admin', 'dorm:new', dorm);
    return dorm;
  }

  async update(ownerId: string, id: string, dto: UpdateDormDto) {
    const dorm = await this.prisma.dorm.findUnique({ where: { id } });
    if (!dorm) throw new NotFoundException('Dorm not found');
    if (dorm.ownerId !== ownerId) throw new ForbiddenException('Not your dorm');
    return this.prisma.dorm.update({ where: { id }, data: dto });
  }

  // เจ้าของหอแก้ไขหอที่ถูกปฏิเสธแล้วส่งอนุมัติใหม่ — กลับไป PENDING_APPROVAL ล้างเหตุผลเดิม (คง rejectionCount ไว้เป็นประวัติ)
  async resubmit(ownerId: string, id: string) {
    const dorm = await this.prisma.dorm.findUnique({ where: { id } });
    if (!dorm) throw new NotFoundException('Dorm not found');
    if (dorm.ownerId !== ownerId) throw new ForbiddenException('Not your dorm');
    if (dorm.status !== 'REJECTED') throw new ForbiddenException('ส่งอนุมัติใหม่ได้เฉพาะหอที่ถูกปฏิเสธ');
    return this.prisma.dorm.update({
      where: { id },
      data: { status: 'PENDING_APPROVAL', rejectionReason: null },
    });
  }

  // แอดมินแก้ข้อมูลหอพักได้ทุกหอ ไม่เช็ค ownership (เผื่อข้อมูลผิดพลาดตอนตรวจสอบ)
  async adminUpdate(id: string, dto: UpdateDormDto) {
    const dorm = await this.prisma.dorm.findUnique({ where: { id } });
    if (!dorm) throw new NotFoundException('Dorm not found');
    return this.prisma.dorm.update({ where: { id }, data: dto });
  }

  // เจ้าของหอเพิ่มรูปหอพักเพิ่มเติมหลังสมัครแล้วได้เอง (แก้ไขรูปที่กรอกผิด/อยากอัปเดต)
  async addImagesOwner(ownerId: string, id: string, files: Express.Multer.File[]) {
    const dorm = await this.prisma.dorm.findUnique({ where: { id } });
    if (!dorm) throw new NotFoundException('Dorm not found');
    if (dorm.ownerId !== ownerId) throw new ForbiddenException('Not your dorm');
    const urls = await this.uploadImages(id, files);
    return this.prisma.dorm.update({ where: { id }, data: { images: [...dorm.images, ...urls] } });
  }

  async removeImageOwner(ownerId: string, id: string, index: number) {
    const dorm = await this.prisma.dorm.findUnique({ where: { id } });
    if (!dorm) throw new NotFoundException('Dorm not found');
    if (dorm.ownerId !== ownerId) throw new ForbiddenException('Not your dorm');
    const images = dorm.images.filter((_, i) => i !== index);
    return this.prisma.dorm.update({ where: { id }, data: { images } });
  }

  private async uploadImages(dormId: string, files: Express.Multer.File[]) {
    const urls: string[] = [];
    for (const file of files ?? []) {
      const key = `dorms/${dormId}/${Date.now()}-${file.originalname}`;
      urls.push(await this.uploads.upload(key, file.buffer, file.mimetype, 'public'));
    }
    return urls;
  }
}
