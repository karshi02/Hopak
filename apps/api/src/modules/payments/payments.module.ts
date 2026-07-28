import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PromptPayGateway } from './gateway/promptpay.gateway';
import { UploadsService } from '../uploads/uploads.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PromptPayGateway, UploadsService, PrismaService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
