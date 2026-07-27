import { Body, Controller, Delete, Get, Param, Patch, Post, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminUsersService } from './admin-users.service';
import { SendWarningDto } from './dto/send-warning.dto';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminUsersController {
  constructor(private adminUsersService: AdminUsersService) {}

  @Get()
  listAll() {
    return this.adminUsersService.listAll();
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.adminUsersService.create(dto);
  }

  @Get(':id/documents')
  listOwnerDocuments(@Param('id') id: string) {
    return this.adminUsersService.listOwnerDocuments(id);
  }

  @Post(':id/documents')
  @UseInterceptors(FilesInterceptor('documents', 10))
  addDocuments(@Param('id') id: string, @UploadedFiles() files: Express.Multer.File[]) {
    return this.adminUsersService.addDocuments(id, files ?? []);
  }

  @Delete(':id/documents/:index')
  removeDocument(@Param('id') id: string, @Param('index') index: string) {
    return this.adminUsersService.removeDocument(id, Number(index));
  }

  @Patch(':id/suspend')
  suspend(@Param('id') id: string, @Body() body: { suspended: boolean }) {
    return this.adminUsersService.setSuspended(id, body.suspended);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.adminUsersService.remove(id);
  }

  @Post(':id/warning')
  sendWarning(@Param('id') id: string, @Body() body: SendWarningDto) {
    return this.adminUsersService.sendWarning(id, body.title, body.message);
  }
}
