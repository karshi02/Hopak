import { Body, Controller, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { documentFileFilter, DOC_LIMIT } from '../../common/upload-filters';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';

@Controller('bookings/:bookingId/payment')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('slip', { fileFilter: documentFileFilter, limits: DOC_LIMIT }))
  pay(
    @CurrentUser() user: { id: string },
    @Param('bookingId') bookingId: string,
    @Body() body: { method: string },
    @UploadedFile() slip: Express.Multer.File,
  ) {
    return this.paymentsService.pay(user.id, bookingId, body.method, slip);
  }
}
