import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminUsersService } from './admin-users.service';
import { SendWarningDto } from './dto/send-warning.dto';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminUsersController {
  constructor(private adminUsersService: AdminUsersService) {}

  @Get()
  listAll() {
    return this.adminUsersService.listAll();
  }

  @Patch(':id/suspend')
  suspend(@Param('id') id: string, @Body() body: { suspended: boolean }) {
    return this.adminUsersService.setSuspended(id, body.suspended);
  }

  @Post(':id/warning')
  sendWarning(@Param('id') id: string, @Body() body: SendWarningDto) {
    return this.adminUsersService.sendWarning(id, body.title, body.message);
  }
}
