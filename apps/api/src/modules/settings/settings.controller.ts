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
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SettingsService, type PromoCard } from './settings.service';

const posterStorage = diskStorage({
  destination: join(process.cwd(), 'uploads'),
  filename: (_req, file, cb) => cb(null, `poster-${Date.now()}-${Math.round(Math.random() * 1e6)}${extname(file.originalname)}`),
});
const imageFileFilter = (_req: unknown, file: Express.Multer.File, cb: (err: Error | null, accept: boolean) => void) => {
  if (!file.mimetype.startsWith('image/')) {
    cb(new BadRequestException('ต้องเป็นไฟล์รูปภาพเท่านั้น'), false);
    return;
  }
  cb(null, true);
};

@Controller()
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get('settings/hero')
  getHero() {
    return this.settingsService.getHero();
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
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new BadRequestException('ต้องเป็นไฟล์รูปภาพเท่านั้น'), false);
          return;
        }
        cb(null, true);
      },
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
  @UseInterceptors(
    FileInterceptor('file', {
      storage: posterStorage,
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: imageFileFilter,
    }),
  )
  async uploadAreaImage(@UploadedFile() file: Express.Multer.File, @Body('province') province: string) {
    if (!file) throw new BadRequestException('ไม่พบไฟล์');
    if (!province) throw new BadRequestException('ไม่พบจังหวัด');
    const apiUrl = process.env.API_URL || 'http://localhost:4000';
    return this.settingsService.setAreaImage(province, `${apiUrl}/uploads/${file.filename}`);
  }

  @Delete('admin/settings/area-image/:province')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  removeAreaImage(@Param('province') province: string) {
    return this.settingsService.removeAreaImage(decodeURIComponent(province));
  }

  @Post('admin/settings/promos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  setPromos(@Body('cards') cards: PromoCard[]) {
    return this.settingsService.setPromoCards(cards ?? []);
  }
}
