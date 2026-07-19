import { Module } from '@nestjs/common';
import { DormsController } from './dorms.controller';
import { DormsService } from './dorms.service';
import { PrismaService } from '../../prisma.service';
import { ReviewsModule } from '../reviews/reviews.module';

@Module({
  imports: [ReviewsModule],
  controllers: [DormsController],
  providers: [DormsService, PrismaService],
  exports: [DormsService],
})
export class DormsModule {}
