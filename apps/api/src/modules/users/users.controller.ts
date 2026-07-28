import { Body, Controller, Delete, Get, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RateLimitGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: { id: string }) {
    return this.usersService.findById(user.id);
  }

  @Patch('me')
  updateProfile(@CurrentUser() user: { id: string }, @Body() body: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, body);
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  updateAvatar(@CurrentUser() user: { id: string }, @UploadedFile() file: Express.Multer.File) {
    return this.usersService.updateAvatar(user.id, file);
  }

  @Patch('me/password')
  changePassword(@CurrentUser() user: { id: string }, @Body() body: ChangePasswordDto) {
    return this.usersService.changePassword(user.id, body.currentPassword, body.newPassword);
  }

  @Post('me/become-owner')
  requestOwner(@CurrentUser() user: { id: string }) {
    return this.usersService.requestOwner(user.id);
  }

  @Get('me/owner-request')
  myOwnerRequest(@CurrentUser() user: { id: string }) {
    return this.usersService.myOwnerRequest(user.id);
  }

  @Post('me/send-verification-otp')
  @RateLimit(5, 60_000) // ขอ OTP: 5 ครั้ง/นาที/IP (เสริมจาก cooldown 60 วิ ต่อบัญชีใน service)
  sendVerificationOtp(@CurrentUser() user: { id: string }) {
    return this.usersService.sendVerificationOtp(user.id);
  }

  @Post('me/verify-email-otp')
  verifyEmailOtp(@CurrentUser() user: { id: string }, @Body('code') code: string) {
    return this.usersService.verifyEmailOtp(user.id, code);
  }

  @Get('me/sessions')
  listSessions(@CurrentUser() user: { id: string }) {
    return this.usersService.listSessions(user.id);
  }

  @Delete('me/sessions/:id')
  revokeSession(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.usersService.revokeSession(user.id, id);
  }
}
