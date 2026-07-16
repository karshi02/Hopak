import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoomsService } from './rooms.service';

@Controller()
export class RoomsController {
  constructor(private roomsService: RoomsService) {}

  @Get('dorms/:dormId/rooms')
  listByDorm(@Param('dormId') dormId: string) {
    return this.roomsService.listByDorm(dormId);
  }

  @Post('dorms/:dormId/rooms')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  create(
    @CurrentUser() user: { id: string },
    @Param('dormId') dormId: string,
    @Body() body: { type: 'AIR' | 'FAN'; pricePerMonth: number },
  ) {
    return this.roomsService.create(user.id, dormId, body);
  }

  @Patch('rooms/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  setStatus(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: { status: 'AVAILABLE' | 'OCCUPIED' },
  ) {
    return this.roomsService.setStatus(user.id, id, body.status);
  }
}
