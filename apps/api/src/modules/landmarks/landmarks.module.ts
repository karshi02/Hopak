import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { UploadsModule } from '../uploads/uploads.module';
import { LandmarksController } from './landmarks.controller';
import { LandmarksService } from './landmarks.service';

@Module({
  imports: [UploadsModule],
  controllers: [LandmarksController],
  providers: [LandmarksService, PrismaService],
})
export class LandmarksModule {}
