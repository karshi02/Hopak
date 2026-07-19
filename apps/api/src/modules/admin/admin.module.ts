import { Module } from '@nestjs/common';
import { ApprovalsController } from './approvals/approvals.controller';
import { ApprovalsService } from './approvals/approvals.service';
import { FinanceController } from './finance/finance.controller';
import { FinanceService } from './finance/finance.service';
import { AnalyticsController } from './analytics/analytics.controller';
import { AnalyticsService } from './analytics/analytics.service';
import { AdminsController } from './admins/admins.controller';
import { AdminsService } from './admins/admins.service';
import { AdminUsersController } from './users/admin-users.controller';
import { AdminUsersService } from './users/admin-users.service';
import { AdminCampaignsController } from './campaigns/admin-campaigns.controller';
import { OwnerRequestsController } from './owner-requests/owner-requests.controller';
import { OwnerRequestsService } from './owner-requests/owner-requests.service';
import { PromotionsService } from '../promotions/promotions.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [
    ApprovalsController,
    FinanceController,
    AnalyticsController,
    AdminsController,
    AdminUsersController,
    AdminCampaignsController,
    OwnerRequestsController,
  ],
  providers: [
    ApprovalsService,
    FinanceService,
    AnalyticsService,
    AdminsService,
    AdminUsersService,
    PromotionsService,
    OwnerRequestsService,
    PrismaService,
  ],
})
export class AdminModule {}
