import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { LandmarksService } from './landmarks.service';

@Controller()
export class LandmarksController {
  constructor(private landmarks: LandmarksService) {}

  // สาธารณะ — หน้าแรกอ่านจาก DB ไม่แตะ Google (กันค่าใช้จ่ายบานตาม traffic)
  @Get('landmarks')
  list(@Query('province') province?: string) {
    return this.landmarks.list(province ?? 'มหาสารคาม');
  }

  // ดึงข้อมูลใหม่จาก Google Places — แอดมินสั่งเองเท่านั้น
  @Post('admin/landmarks/sync')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  sync(@Body('province') province?: string, @Body('perDistrict') perDistrict?: number) {
    return this.landmarks.sync(province ?? 'มหาสารคาม', perDistrict ?? 2);
  }

  @Delete('admin/landmarks/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.landmarks.remove(id);
  }
}
