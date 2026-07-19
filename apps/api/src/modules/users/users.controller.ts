import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
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
}
