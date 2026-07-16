import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { FinanceService } from './finance.service';

@Controller('admin/finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class FinanceController {
  constructor(private financeService: FinanceService) {}

  @Get('summary')
  summary() {
    return this.financeService.summary();
  }

  @Post('transfer')
  transfer() {
    return this.financeService.transferToOwners();
  }
}
