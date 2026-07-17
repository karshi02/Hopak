import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
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
}
