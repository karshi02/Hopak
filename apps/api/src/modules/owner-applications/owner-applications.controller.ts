import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { imageFileFilter, documentFileFilter, IMAGE_LIMIT, DOC_LIMIT } from '../../common/upload-filters';
import { OwnerApplicationsService } from './owner-applications.service';
import { StartApplicationDto } from './dto/start-application.dto';
import { UpdateDormInfoDto } from './dto/update-dorm-info.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { FinishApplicationDto } from './dto/finish-application.dto';
import { SetCoverPhotoDto } from './dto/set-cover-photo.dto';

// ใบสมัครเปิดหอพัก — ไม่ต้องล็อกอิน (ยังไม่มีบัญชีจริงจนกว่าจะถึง finish)
// id ของใบสมัคร (cuid สุ่มไม่คาดเดาได้) ทำหน้าที่เป็น token เข้าถึงแทน JWT ระหว่างขั้นตอนนี้
@Controller('owner-applications')
export class OwnerApplicationsController {
  constructor(private service: OwnerApplicationsService) {}

  @Post()
  start(@Body() dto: StartApplicationDto) {
    return this.service.start(dto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const app = await this.service.findSafe(id);
    if (!app) throw new NotFoundException('ไม่พบใบสมัคร');
    return app;
  }

  @Patch(':id/dorm')
  updateDorm(@Param('id') id: string, @Body() dto: UpdateDormInfoDto) {
    return this.service.updateDormInfo(id, dto);
  }

  @Post(':id/photos')
  @UseInterceptors(FileInterceptor('file', { fileFilter: imageFileFilter, limits: IMAGE_LIMIT }))
  addPhoto(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.service.addPhoto(id, file);
  }

  @Patch(':id/photos/cover')
  setCoverPhoto(@Param('id') id: string, @Body() dto: SetCoverPhotoDto) {
    return this.service.setCoverPhoto(id, dto.url);
  }

  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file', { fileFilter: documentFileFilter, limits: DOC_LIMIT }))
  addDocument(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.service.addDocument(id, file);
  }

  @Post(':id/send-otp')
  sendOtp(@Param('id') id: string) {
    return this.service.sendOtp(id);
  }

  @Post(':id/verify-otp')
  verifyOtp(@Param('id') id: string, @Body() dto: VerifyOtpDto) {
    return this.service.verifyOtp(id, dto.code);
  }

  @Post(':id/finish')
  finish(@Param('id') id: string, @Body() dto: FinishApplicationDto) {
    return this.service.finish(id, dto);
  }
}
