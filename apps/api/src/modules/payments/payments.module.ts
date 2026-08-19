import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { WebhooksController } from './webhooks.controller';
import { OwnerIncomeController } from './owner-income.controller';
import { PaymentsService } from './payments.service';
import { XenditGateway } from './gateway/xendit.gateway';
import { UploadsService } from '../uploads/uploads.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaService } from '../../prisma.service';

import { SettingsService } from '../settings/settings.service';

@Module({
  imports: [RealtimeModule, NotificationsModule],
  controllers: [PaymentsController, WebhooksController, OwnerIncomeController],
  providers: [PaymentsService, XenditGateway, UploadsService, PrismaService, SettingsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
