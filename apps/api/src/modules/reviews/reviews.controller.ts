import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Controller('dorms/:dormId/reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Get()
  list(@Param('dormId') dormId: string) {
    return this.reviewsService.listForDorm(dormId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('tenant')
  create(@CurrentUser() user: { id: string }, @Param('dormId') dormId: string, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(user.id, dormId, dto);
  }
}
