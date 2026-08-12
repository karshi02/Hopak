import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeGateway } from './realtime.gateway';
import { requireEnv } from '../../common/env.util';
import { PrismaService } from '../../prisma.service';

@Module({
  imports: [
    JwtModule.register({
      secret: requireEnv('JWT_SECRET'),
    }),
  ],
  providers: [RealtimeGateway, PrismaService],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
