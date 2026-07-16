import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';

@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('bookings-by-province')
  bookingsByProvince() {
    return this.analyticsService.bookingsByProvince();
  }
}
