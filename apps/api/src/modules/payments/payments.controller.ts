import { Body, Controller, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';

@Controller('bookings/:bookingId/payment')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('slip'))
  pay(
    @Param('bookingId') bookingId: string,
    @Body() body: { method: string },
    @UploadedFile() slip: Express.Multer.File,
  ) {
    return this.paymentsService.pay(bookingId, body.method, slip);
  }
}
