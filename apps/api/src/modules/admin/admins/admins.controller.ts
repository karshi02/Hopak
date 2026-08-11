import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminRoles } from '../../../common/decorators/admin-roles.decorator';
import { AdminRolesGuard } from '../../../common/guards/admin-roles.guard';
import { AdminsService } from './admins.service';

@Controller('admin/admins')
@UseGuards(JwtAuthGuard, RolesGuard, AdminRolesGuard)
@Roles('admin')
@AdminRoles('SUPER_ADMIN')
export class AdminsController {
  constructor(private adminsService: AdminsService) {}

  @Get()
  list() {
    return this.adminsService.list();
  }

  @Post()
  create(@Body() body: { userId: string; adminRole: 'SUPER_ADMIN' | 'ADMIN' | 'FINANCE' | 'SUPPORT' }) {
    return this.adminsService.create(body.userId, body.adminRole);
  }
}
