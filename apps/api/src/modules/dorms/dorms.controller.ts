import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DormsService } from './dorms.service';
import { CreateDormDto } from './dto/create-dorm.dto';
import { UpdateDormDto } from './dto/update-dorm.dto';
import { SearchQueryDto } from './dto/search-query.dto';

@Controller('dorms')
export class DormsController {
  constructor(private dormsService: DormsService) {}

  @Get()
  search(@Query() query: SearchQueryDto) {
    return this.dormsService.search(query);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  listMine(@CurrentUser() user: { id: string }) {
    return this.dormsService.listMine(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dormsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateDormDto) {
    return this.dormsService.create(user.id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  update(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() dto: UpdateDormDto) {
    return this.dormsService.update(user.id, id, dto);
  }

  @Post(':id/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  @UseInterceptors(FilesInterceptor('photos', 8))
  addImages(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.dormsService.addImagesOwner(user.id, id, files ?? []);
  }

  @Delete(':id/images/:index')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  removeImage(@CurrentUser() user: { id: string }, @Param('id') id: string, @Param('index') index: string) {
    return this.dormsService.removeImageOwner(user.id, id, Number(index));
  }
}
