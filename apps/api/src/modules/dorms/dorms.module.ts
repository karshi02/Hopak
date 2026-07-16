import { Module } from '@nestjs/common';
import { DormsController } from './dorms.controller';
import { DormsService } from './dorms.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [DormsController],
  providers: [DormsService, PrismaService],
  exports: [DormsService],
})
export class DormsModule {}
