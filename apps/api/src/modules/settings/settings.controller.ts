import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SettingsService, type PromoCard, type HomeContent } from './settings.service';
import { imageFileFilter } from '../../common/upload-filters';

const posterStorage = diskStorage({
  destination: join(process.cwd(), 'uploads'),
  filename: (_req, file, cb) => cb(null, `poster-${Date.now()}-${Math.round(Math.random() * 1e6)}${extname(file.originalname)}`),
});

@Controller()
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get('settings/hero')
  getHero() {
    return this.settingsService.getHero();
  }

  // อ่านได้สาธารณะ — หน้าเว็บฝั่งเจ้าของหอ/หน้าขายของต้องโชว์ % ให้ตรงกับที่ระบบหักจริง
  @Get('settings/fees')
  getFees() {
    return this.settingsService.getFees();
  }

  @Post('admin/settings/fees')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  setFees(@Body() body: { commissionRate: number; dailyCommissionRate: number }) {
    return this.settingsService.setFees({
      commissionRate: Number(body?.commissionRate),
      dailyCommissionRate: Number(body?.dailyCommissionRate),
    });
  }

  @Post('admin/settings/hero')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads'),
        filename: (_req, file, cb) => cb(null, `hero-${Date.now()}${extname(file.originalname)}`),
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: imageFileFilter,
    }),
  )
  async uploadHero(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('ไม่พบไฟล์');
    const apiUrl = process.env.API_URL || 'http://localhost:4000';
    return this.settingsService.setHero(`${apiUrl}/uploads/${file.filename}`);
  }

  @Post('admin/settings/posters')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: posterStorage,
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: imageFileFilter,
    }),
  )
  async uploadPosters(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException('ไม่พบไฟล์');
    const apiUrl = process.env.API_URL || 'http://localhost:4000';
    const urls = files.map((f) => `${apiUrl}/uploads/${f.filename}`);
    return this.settingsService.addPosters(urls);
  }

  @Delete('admin/settings/posters/:index')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  removePoster(@Param('index') index: string) {
    return this.settingsService.removePoster(Number(index));
  }

  @Post('admin/settings/area-image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  // รับได้ทั้งช่อง 'file' (ของเดิม ไฟล์เดียว) และ 'files' (หลายไฟล์) — เพิ่มต่อท้ายรูปเดิมของจังหวัดนั้น
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'file', maxCount: 8 }, { name: 'files', maxCount: 8 }], {
      storage: posterStorage,
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: imageFileFilter,
    }),
  )
  async uploadAreaImage(
    @UploadedFiles() uploaded: { file?: Express.Multer.File[]; files?: Express.Multer.File[] },
    @Body('province') province: string,
  ) {
    const files = [...(uploaded?.file ?? []), ...(uploaded?.files ?? [])];
    if (!files.length) throw new BadRequestException('ไม่พบไฟล์');
    if (!province) throw new BadRequestException('ไม่พบจังหวัด');
    const apiUrl = process.env.API_URL || 'http://localhost:4000';
    return this.settingsService.addAreaImages(
      province,
      files.map((f) => `${apiUrl}/uploads/${f.filename}`),
    );
  }

  // ลบทั้งจังหวัด
  @Delete('admin/settings/area-image/:province')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  removeAreaImage(@Param('province') province: string) {
    return this.settingsService.removeAreaImage(decodeURIComponent(province));
  }

  // ลบเฉพาะรูปที่ index นั้นของจังหวัด
  @Delete('admin/settings/area-image/:province/:index')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  removeAreaImageAt(@Param('province') province: string, @Param('index') index: string) {
    return this.settingsService.removeAreaImage(decodeURIComponent(province), Number(index));
  }

  @Post('admin/settings/promos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  setPromos(@Body('cards') cards: PromoCard[]) {
    return this.settingsService.setPromoCards(cards ?? []);
  }

  @Post('admin/settings/home-content')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  setHomeContent(@Body() content: HomeContent) {
    return this.settingsService.setHomeContent(content ?? {});
  }

  @Delete('admin/settings/hero')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  clearHero() {
    return this.settingsService.clearHero();
  }
}
