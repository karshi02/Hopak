import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ApprovalsService } from './approvals.service';

@Controller('admin/approvals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ApprovalsController {
  constructor(private approvalsService: ApprovalsService) {}

  @Get()
  listPending() {
    return this.approvalsService.listPending();
  }

  @Patch(':dormId/approve')
  approve(@Param('dormId') dormId: string) {
    return this.approvalsService.approve(dormId);
  }

  @Patch(':dormId/reject')
  reject(@Param('dormId') dormId: string) {
    return this.approvalsService.reject(dormId);
  }
}
