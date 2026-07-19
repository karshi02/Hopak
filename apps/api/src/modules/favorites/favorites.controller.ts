import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FavoritesService } from './favorites.service';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private favoritesService: FavoritesService) {}

  @Get()
  listMine(@CurrentUser() user: { id: string }) {
    return this.favoritesService.listMine(user.id);
  }

  @Post(':dormId/toggle')
  toggle(@CurrentUser() user: { id: string }, @Param('dormId') dormId: string) {
    return this.favoritesService.toggle(user.id, dormId);
  }
}
