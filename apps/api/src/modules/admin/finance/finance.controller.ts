import { Body, Controller, Get, Param, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { documentFileFilter, DOC_LIMIT } from '../../../common/upload-filters';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminRoles } from '../../../common/decorators/admin-roles.decorator';
import { AdminRolesGuard } from '../../../common/guards/admin-roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { FinanceService } from './finance.service';

@Controller('admin/finance')
@UseGuards(JwtAuthGuard, RolesGuard, AdminRolesGuard)
@Roles('admin')
@AdminRoles('SUPER_ADMIN', 'FINANCE')
export class FinanceController {
  constructor(private financeService: FinanceService) {}

  @Get('summary')
  summary(@Query('year') year?: string, @Query('month') month?: string) {
    return this.financeService.summary(year ? Number(year) : undefined, month ? Number(month) : undefined);
  }

  // สรุปภาพรวมทั้งปี — ยอดรวม, ค่าคอม, เงินโอนออก, ยอดคงเหลือ, สมาชิก, เจ้าของหอ
  @Get('yearly')
  yearlySummary(@Query('year') year?: string) {
    return this.financeService.yearlySummary(year ? Number(year) : undefined);
  }

  // ยอดค้างโอนแยกรายเดือน/รายวันต่อหอ + ส่วนแบ่งแพลตฟอร์มของแต่ละประเภท
  @Get('payout-breakdown')
  payoutBreakdown(@Query('dormId') dormId?: string) {
    return this.financeService.payoutBreakdown(dormId);
  }

  // รายได้แพลตฟอร์มแยกรายเดือน/รายวัน ตามช่วงเวลา (วัน/เดือน/ปี)
  @Get('revenue-breakdown')
  revenueBreakdown(@Query('period') period?: 'day' | 'month' | 'year', @Query('year') year?: string) {
    return this.financeService.revenueBreakdown(period ?? 'month', year ? Number(year) : undefined);
  }

  // รายได้หอพักรายวันโดยเฉพาะ แยกตามหอ (คนละส่วนกับรายเดือน)
  @Get('daily-summary')
  dailySummary(@Query('year') year?: string, @Query('month') month?: string) {
    return this.financeService.dailySummary(year ? Number(year) : undefined, month ? Number(month) : undefined);
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

  // โอน payout อัตโนมัติผ่าน Xendit ไปบัญชีเจ้าของหอ (ไม่ต้องอัปสลิป)
  // โอนแยกประเภทได้ด้วย ?rentalType=DAILY|MONTHLY (ไม่ใส่ = โอนรวมทั้งหมดของหอนั้น)
  @Post('payouts/dorm/:dormId/transfer-xendit')
  transferForDormXendit(
    @Param('dormId') dormId: string,
    @CurrentUser() admin: { id: string },
    @Body('amount') amount?: string,
    @Body('note') note?: string,
    @Body('rentalType') rentalType?: 'MONTHLY' | 'DAILY',
  ) {
    return this.financeService.transferForDormViaXendit(
      dormId,
      admin.id,
      amount ? Number(amount) : undefined,
      note,
      rentalType,
    );
  }

  @Post('payouts/dorm/:dormId/transfer')
  @UseInterceptors(FileInterceptor('slip', { fileFilter: documentFileFilter, limits: DOC_LIMIT }))
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
