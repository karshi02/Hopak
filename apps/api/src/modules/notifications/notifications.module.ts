import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushService } from './push/push.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { PrismaService } from '../../prisma.service';

@Module({
  imports: [RealtimeModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, PushService, PrismaService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
