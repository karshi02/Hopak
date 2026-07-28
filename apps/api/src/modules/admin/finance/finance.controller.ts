import { Body, Controller, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { FinanceService } from './finance.service';

@Controller('admin/finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class FinanceController {
  constructor(private financeService: FinanceService) {}

  @Get('summary')
  summary(@Query('year') year?: string, @Query('month') month?: string) {
    return this.financeService.summary(year ? Number(year) : undefined, month ? Number(month) : undefined);
  }

  @Get('payments')
  listDetailed(@Query('year') year?: string, @Query('month') month?: string) {
    return this.financeService.listDetailed(year ? Number(year) : undefined, month ? Number(month) : undefined);
  }

  @Get('periods')
  availablePeriods() {
    return this.financeService.availablePeriods();
  }

  @Get('payouts')
  listPendingPayouts() {
    return this.financeService.listPendingPayouts();
  }

  @Get('transfers')
  transferHistory() {
    return this.financeService.transferHistory();
  }

  @Get('owners/:ownerId')
  getOwnerDetail(@Param('ownerId') ownerId: string) {
    return this.financeService.getOwnerDetail(ownerId);
  }

  @Patch('payments/:paymentId/settle')
  settlePayment(@Param('paymentId') paymentId: string) {
    return this.financeService.settlePayment(paymentId);
  }

  @Post('payouts/dorm/:dormId/transfer')
  @UseInterceptors(FileInterceptor('slip'))
  transferForDorm(
    @Param('dormId') dormId: string,
    @CurrentUser() admin: { id: string },
    @UploadedFile() slip: Express.Multer.File,
    @Body('amount') amount?: string,
    @Body('note') note?: string,
  ) {
    return this.financeService.transferForDorm(
      dormId,
      admin.id,
      slip,
      amount ? Number(amount) : undefined,
      note,
    );
  }
}
