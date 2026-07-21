import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { PrismaService } from '../../prisma.service';

@Module({
  imports: [RealtimeModule],
  controllers: [BookingsController],
  providers: [BookingsService, PrismaService],
  exports: [BookingsService],
})
export class BookingsModule {}
