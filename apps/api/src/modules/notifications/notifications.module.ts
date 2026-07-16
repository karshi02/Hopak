import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushService } from './push/push.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, PushService, PrismaService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
