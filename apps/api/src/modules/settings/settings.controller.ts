import { BadRequestException, Controller, Get, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SettingsService } from './settings.service';

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
}
