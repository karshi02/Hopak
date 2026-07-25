import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { extname } from 'path';
import { verifyFileToken } from '../../common/file-signing.util';
import { UploadsService } from './uploads.service';

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

// เสิร์ฟไฟล์ private (บัตรประชาชน/โฉนด/ทะเบียนบ้าน) ผ่าน token เซ็นชื่อหมดอายุเท่านั้น
// ไม่มี URL ถาวรสาธารณะสำหรับเอกสารพวกนี้ — ต้องขอ token ใหม่ทุกครั้งผ่าน endpoint ที่มี auth guard
@Controller('files')
export class FilesController {
  constructor(private uploads: UploadsService) {}

  @Get(':token')
  async serve(@Param('token') token: string, @Res() res: Response) {
    const key = verifyFileToken(token);
    if (!key) throw new NotFoundException('ลิงก์หมดอายุหรือไม่ถูกต้อง');

    const buffer = await this.uploads.readPrivate(key);
    if (!buffer) throw new NotFoundException('ไม่พบไฟล์');

    const mime = MIME_BY_EXT[extname(key).toLowerCase()] || 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.send(buffer);
  }
}
