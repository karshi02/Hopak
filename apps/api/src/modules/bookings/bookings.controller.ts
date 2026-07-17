import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @Post()
  @Roles('tenant')
  @UseGuards(RolesGuard)
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: { id: string; role: string }) {
    const role = user.role.toLowerCase();
    if (role === 'admin') return this.bookingsService.listAll();
    if (role === 'owner') return this.bookingsService.listForOwner(user.id);
    return this.bookingsService.listForTenant(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookingsService.findOne(id);
  }

  @Patch(':id/confirm')
  @Roles('owner')
  @UseGuards(RolesGuard)
  confirm(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.bookingsService.confirm(user.id, id);
  }

  @Patch(':id/reject')
  @Roles('owner')
  @UseGuards(RolesGuard)
  reject(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.bookingsService.reject(user.id, id);
  }

  @Patch(':id/cancel')
  cancel(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.bookingsService.cancel(user.id, id);
  }
}
