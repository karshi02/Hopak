import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { IntegrationsController } from './integrations.controller';

// ระบบรวมยอดของกลุ่ม (LS Hub) อ่านยอดชำระเงิน — อ่านอย่างเดียว ล็อกด้วย LSHUB_API_KEY
@Module({
  controllers: [IntegrationsController],
  providers: [PrismaService],
})
export class IntegrationsModule {}
