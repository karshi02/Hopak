import { Body, Controller, Delete, Get, Param, Patch, Post, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoomsService } from './rooms.service';

interface CreateRoomBody {
  type: 'AIR' | 'FAN';
  pricePerMonth: string;
  name?: string;
  description?: string;
  deposit?: string;
  waterRate?: string;
  electricRate?: string;
  amenities?: string; // JSON-stringified string[] (multipart ส่งเป็น string เสมอ)
  quantity?: string;
}

@Controller()
export class RoomsController {
  constructor(private roomsService: RoomsService) {}

  @Get('dorms/:dormId/rooms')
  listByDorm(@Param('dormId') dormId: string) {
    return this.roomsService.listByDorm(dormId);
  }

  @Get('rooms/:id')
  findOne(@Param('id') id: string) {
    return this.roomsService.findOne(id);
  }

  @Post('dorms/:dormId/rooms')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  @UseInterceptors(FilesInterceptor('photos', 8))
  create(
    @CurrentUser() user: { id: string },
    @Param('dormId') dormId: string,
    @Body() body: CreateRoomBody,
    @UploadedFiles() photos: Express.Multer.File[],
  ) {
    let amenities: string[] = [];
    try {
      amenities = body.amenities ? JSON.parse(body.amenities) : [];
    } catch {
      amenities = [];
    }

    return this.roomsService.create(
      user.id,
      dormId,
      {
        type: body.type,
        pricePerMonth: Number(body.pricePerMonth),
        name: body.name,
        description: body.description,
        deposit: body.deposit ? Number(body.deposit) : 0,
        waterRate: body.waterRate ? Number(body.waterRate) : 0,
        electricRate: body.electricRate ? Number(body.electricRate) : 0,
        amenities,
        quantity: body.quantity ? Number(body.quantity) : 1,
      },
      photos ?? [],
    );
  }

  // ตัด/คืนห้องด้วยมือ — เฉพาะแอดมิน (ย้ายจากเจ้าของหอ กันทุจริต)
  @Patch('rooms/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  setStatus(@Param('id') id: string, @Body() body: { status: 'AVAILABLE' | 'OCCUPIED' }) {
    return this.roomsService.setStatus(id, body.status);
  }

  @Patch('rooms/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  update(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.roomsService.update(user.id, id, body);
  }

  @Post('rooms/:id/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  @UseInterceptors(FilesInterceptor('photos', 8))
  addImages(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.roomsService.addImages(user.id, id, files ?? []);
  }

  @Delete('rooms/:id/images/:index')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  removeImage(@CurrentUser() user: { id: string }, @Param('id') id: string, @Param('index') index: string) {
    return this.roomsService.removeImage(user.id, id, Number(index));
  }
}
