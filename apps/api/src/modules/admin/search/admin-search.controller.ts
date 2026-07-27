import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminSearchService } from './admin-search.service';

@Controller('admin/search')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminSearchController {
  constructor(private adminSearchService: AdminSearchService) {}

  @Get()
  search(@Query('q') q: string) {
    return this.adminSearchService.search(q);
  }
}
