import { Body, Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { OwnerRequestsService } from './owner-requests.service';

@Controller('admin/owner-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class OwnerRequestsController {
  constructor(private ownerRequestsService: OwnerRequestsService) {}

  @Get()
  list() {
    return this.ownerRequestsService.list();
  }

  // 'stats' ต้องมาก่อน route อื่นที่ไม่มี param — แต่ที่นี่ไม่มี :id ชนกัน วางได้ปกติ
  @Get('stats')
  stats() {
    return this.ownerRequestsService.stats();
  }

  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.ownerRequestsService.approve(id);
  }

  @Patch(':id/reject')
  reject(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.ownerRequestsService.reject(id, body?.reason);
  }
}
