import { Module } from '@nestjs/common';
import { DormsController } from './dorms.controller';
import { DormsService } from './dorms.service';
import { PrismaService } from '../../prisma.service';
import { ReviewsModule } from '../reviews/reviews.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { UploadsService } from '../uploads/uploads.service';

@Module({
  imports: [ReviewsModule, RealtimeModule],
  controllers: [DormsController],
  providers: [DormsService, PrismaService, UploadsService],
  exports: [DormsService],
})
export class DormsModule {}
