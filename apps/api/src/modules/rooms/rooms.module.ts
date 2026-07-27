import { Module } from '@nestjs/common';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { UploadsService } from '../uploads/uploads.service';
import { PrismaService } from '../../prisma.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  controllers: [RoomsController],
  providers: [RoomsService, UploadsService, PrismaService],
  exports: [RoomsService],
})
export class RoomsModule {}
