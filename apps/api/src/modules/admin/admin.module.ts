import { Module } from '@nestjs/common';
import { ApprovalsController } from './approvals/approvals.controller';
import { ApprovalsService } from './approvals/approvals.service';
import { FinanceController } from './finance/finance.controller';
import { FinanceService } from './finance/finance.service';
import { AnalyticsController } from './analytics/analytics.controller';
import { AnalyticsService } from './analytics/analytics.service';
import { AdminsController } from './admins/admins.controller';
import { AdminsService } from './admins/admins.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [ApprovalsController, FinanceController, AnalyticsController, AdminsController],
  providers: [ApprovalsService, FinanceService, AnalyticsService, AdminsService, PrismaService],
})
export class AdminModule {}
