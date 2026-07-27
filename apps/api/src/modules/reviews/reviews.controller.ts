import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
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

  @Patch(':reviewId/reply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  reply(
    @CurrentUser() user: { id: string },
    @Param('reviewId') reviewId: string,
    @Body('reply') replyText: string,
  ) {
    return this.reviewsService.reply(user.id, reviewId, replyText);
  }
}
