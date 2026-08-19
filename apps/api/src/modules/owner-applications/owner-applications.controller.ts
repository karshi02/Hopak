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
  Headers,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { imageFileFilter, documentFileFilter, IMAGE_LIMIT, DOC_LIMIT } from '../../common/upload-filters';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { OwnerApplicationsService } from './owner-applications.service';
import { StartApplicationDto } from './dto/start-application.dto';
import { UpdateDormInfoDto } from './dto/update-dorm-info.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { FinishApplicationDto } from './dto/finish-application.dto';
import { SetCoverPhotoDto } from './dto/set-cover-photo.dto';
import { TurnstileService } from '../../common/turnstile.service';

// ใบสมัครเปิดหอพัก — ไม่ต้องล็อกอิน (ยังไม่มีบัญชีจริงจนกว่าจะถึง finish)
// การเข้าถึงใช้ "continuation secret" ที่ออกให้ครั้งเดียวตอน POST /owner-applications
// (id อย่างเดียวไม่พอ เพราะ start ด้วยอีเมลของคนอื่นก็ได้ id เดิมกลับไป)
// ทุก route ที่แตะใบสมัครต้องส่ง header: x-application-secret
@Controller('owner-applications')
@UseGuards(RateLimitGuard)
export class OwnerApplicationsController {
  constructor(
    private service: OwnerApplicationsService,
    private turnstile: TurnstileService,
  ) {}

  @Post()
  @RateLimit(5, 60_000) // เริ่มใบสมัคร: 5 ครั้ง/นาที/IP กันสแปม + กันไล่ยิงอีเมลคนอื่น
  async start(@Body() dto: StartApplicationDto, @Req() req: Request) {
    // ด่านกันบอท — endpoint นี้ส่งอีเมล OTP ออกไปให้ที่อยู่ที่กรอกมา ปล่อยให้ยิงรัวได้ = สแปมคนอื่นแทนเรา
    await this.turnstile.verify(dto.turnstileToken, req.ip, 'owner-signup');
    return this.service.start(dto);
  }

  @Get(':id')
  @RateLimit(60, 60_000)
  async findOne(@Param('id') id: string, @Headers('x-application-secret') secret?: string) {
    const app = await this.service.findSafe(id, secret);
    if (!app) throw new NotFoundException('ไม่พบใบสมัคร');
    return app;
  }

  @Patch(':id/dorm')
  @RateLimit(30, 60_000)
  updateDorm(
    @Param('id') id: string,
    @Body() dto: UpdateDormInfoDto,
    @Headers('x-application-secret') secret?: string,
  ) {
    return this.service.updateDormInfo(id, secret, dto);
  }

  @Post(':id/photos')
  @RateLimit(30, 60_000)
  @UseInterceptors(FileInterceptor('file', { fileFilter: imageFileFilter, limits: IMAGE_LIMIT }))
  addPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Headers('x-application-secret') secret?: string,
  ) {
    return this.service.addPhoto(id, secret, file);
  }

  @Patch(':id/photos/cover')
  @RateLimit(30, 60_000)
  setCoverPhoto(
    @Param('id') id: string,
    @Body() dto: SetCoverPhotoDto,
    @Headers('x-application-secret') secret?: string,
  ) {
    return this.service.setCoverPhoto(id, secret, dto.url);
  }

  @Post(':id/documents')
  @RateLimit(20, 60_000) // จำกัดการอัปโหลด กัน storage abuse
  @UseInterceptors(FileInterceptor('file', { fileFilter: documentFileFilter, limits: DOC_LIMIT }))
  addDocument(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Headers('x-application-secret') secret?: string,
  ) {
    return this.service.addDocument(id, secret, file);
  }

  @Post(':id/send-otp')
  @RateLimit(5, 60_000) // กันสแปมอีเมล
  sendOtp(@Param('id') id: string, @Headers('x-application-secret') secret?: string) {
    return this.service.sendOtp(id, secret);
  }

  @Post(':id/verify-otp')
  @RateLimit(10, 60_000) // กัน brute force OTP (มี otpAttempts เป็นด่านสองอยู่แล้ว)
  verifyOtp(@Param('id') id: string, @Body() dto: VerifyOtpDto, @Headers('x-application-secret') secret?: string) {
    return this.service.verifyOtp(id, dto.code, secret);
  }

  @Post(':id/finish')
  @RateLimit(10, 60_000)
  finish(
    @Param('id') id: string,
    @Body() dto: FinishApplicationDto,
    @Headers('x-application-secret') secret?: string,
  ) {
    return this.service.finish(id, dto, secret);
  }
}
