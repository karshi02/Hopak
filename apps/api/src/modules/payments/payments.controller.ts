import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';

@Controller('bookings/:bookingId/payment')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post()
  pay(@Param('bookingId') bookingId: string, @Body() body: { method: string }) {
    return this.paymentsService.pay(bookingId, body.method);
  }
}
