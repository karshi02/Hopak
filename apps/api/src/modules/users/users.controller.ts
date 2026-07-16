import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: { id: string }) {
    return this.usersService.findById(user.id);
  }

  @Patch('me')
  updateProfile(@CurrentUser() user: { id: string }, @Body() body: { name?: string; avatarUrl?: string }) {
    return this.usersService.updateProfile(user.id, body);
  }

  @Post('me/become-owner')
  becomeOwner(@CurrentUser() user: { id: string }) {
    return this.usersService.becomeOwner(user.id);
  }
}
