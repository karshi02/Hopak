import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';

@Controller('bookings/:bookingId/payment')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  // สร้าง QR พร้อมเพย์ให้สแกนจ่าย — คืน qrString ให้ frontend เรนเดอร์เป็นรูป QR
  @Post('charge')
  charge(@CurrentUser() user: { id: string }, @Param('bookingId') bookingId: string) {
    return this.paymentsService.createCharge(user.id, bookingId);
  }

  // dev เท่านั้น: จำลองเงินเข้า (ไม่ต้องมี webhook สาธารณะ) — production จะโดนปฏิเสธ
  @Post('dev-confirm')
  devConfirm(@CurrentUser() user: { id: string }, @Param('bookingId') bookingId: string) {
    return this.paymentsService.devConfirm(user.id, bookingId);
  }
}
