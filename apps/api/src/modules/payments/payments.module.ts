import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsCron } from './payments.cron';
import { PromptPayGateway } from './gateway/promptpay.gateway';
import { RealtimeModule } from '../realtime/realtime.module';
import { PrismaService } from '../../prisma.service';

@Module({
  imports: [ScheduleModule.forRoot(), RealtimeModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsCron, PromptPayGateway, PrismaService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
