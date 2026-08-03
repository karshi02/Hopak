import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';

// รายได้ payout ของเจ้าของหอ (รอโอน / โอนแล้ว) — ใช้บนแดชบอร์ดเจ้าของหอ
@Controller('partner')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('owner')
export class OwnerIncomeController {
  constructor(private paymentsService: PaymentsService) {}

  @Get('income')
  getIncome(@CurrentUser() user: { id: string }) {
    return this.paymentsService.getOwnerIncome(user.id);
  }

  // รายได้รายวัน (group ตามวัน) — filter ช่วงวันได้ผ่าน ?from=YYYY-MM-DD&to=YYYY-MM-DD
  @Get('income/daily')
  getDailyIncome(
    @CurrentUser() user: { id: string },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.paymentsService.getOwnerDailyIncome(user.id, from, to);
  }
}
