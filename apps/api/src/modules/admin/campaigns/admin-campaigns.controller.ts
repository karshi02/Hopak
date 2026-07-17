import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { PromotionsService } from '../../promotions/promotions.service';

@Controller('admin/campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminCampaignsController {
  constructor(private promotionsService: PromotionsService) {}

  @Get()
  listAll() {
    return this.promotionsService.listAll();
  }

  @Post()
  create(
    @Body()
    body: {
      dormId: string;
      kind: 'BOOST' | 'BANNER' | 'FEATURED';
      startAt: string;
      endAt: string;
      price: number;
    },
  ) {
    return this.promotionsService.create(
      body.dormId,
      body.kind,
      new Date(body.startAt),
      new Date(body.endAt),
      body.price,
    );
  }
}
