import { Body, Controller, Delete, Get, Patch, Param, Post, Query, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { imageFileFilter, IMAGE_LIMIT } from '../../../common/upload-filters';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ApprovalsService } from './approvals.service';

@Controller('admin/approvals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ApprovalsController {
  constructor(private approvalsService: ApprovalsService) {}

  @Get()
  listPending() {
    return this.approvalsService.listPending();
  }

  @Get('log')
  listLog(@Query('entityId') entityId?: string) {
    return this.approvalsService.listLog(entityId);
  }

  @Patch(':dormId/approve')
  approve(@CurrentUser() admin: { id: string }, @Param('dormId') dormId: string) {
    return this.approvalsService.approve(dormId, admin.id);
  }

  @Patch(':dormId/reject')
  reject(
    @CurrentUser() admin: { id: string },
    @Param('dormId') dormId: string,
    @Body('reason') reason: string,
  ) {
    return this.approvalsService.reject(dormId, admin.id, reason);
  }

  @Patch(':dormId/suspend')
  suspendDorm(
    @CurrentUser() admin: { id: string },
    @Param('dormId') dormId: string,
    @Body('note') note?: string,
  ) {
    return this.approvalsService.suspendDorm(dormId, admin.id, note);
  }

  @Patch(':dormId/unsuspend')
  unsuspendDorm(@CurrentUser() admin: { id: string }, @Param('dormId') dormId: string) {
    return this.approvalsService.unsuspendDorm(dormId, admin.id);
  }

  @Patch(':dormId/edit')
  updateDorm(
    @CurrentUser() admin: { id: string },
    @Param('dormId') dormId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.approvalsService.updateDorm(dormId, admin.id, body);
  }

  @Post(':dormId/images')
  @UseInterceptors(FilesInterceptor('photos', 8, { fileFilter: imageFileFilter, limits: IMAGE_LIMIT }))
  addImages(
    @CurrentUser() admin: { id: string },
    @Param('dormId') dormId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.approvalsService.addImages(dormId, admin.id, files ?? []);
  }

  @Delete(':dormId/images/:index')
  removeImage(
    @CurrentUser() admin: { id: string },
    @Param('dormId') dormId: string,
    @Param('index') index: string,
  ) {
    return this.approvalsService.removeImage(dormId, admin.id, Number(index));
  }

  @Patch(':dormId/auto-approve-rooms')
  setAutoApproveRooms(@Param('dormId') dormId: string, @Body('enabled') enabled: boolean) {
    return this.approvalsService.setAutoApproveRooms(dormId, enabled);
  }

  @Get('dorms')
  listAllDorms() {
    return this.approvalsService.listAllDorms();
  }

  @Get('rooms')
  listPendingRooms() {
    return this.approvalsService.listPendingRooms();
  }

  @Patch('rooms/:roomId/approve')
  approveRoom(@CurrentUser() admin: { id: string }, @Param('roomId') roomId: string) {
    return this.approvalsService.approveRoom(roomId, admin.id);
  }

  @Patch('rooms/:roomId/reject')
  rejectRoom(@CurrentUser() admin: { id: string }, @Param('roomId') roomId: string) {
    return this.approvalsService.rejectRoom(roomId, admin.id);
  }

  @Get('dorms/:dormId/rooms')
  listRoomsForDorm(@Param('dormId') dormId: string) {
    return this.approvalsService.listRoomsForDorm(dormId);
  }

  @Patch('rooms/:roomId/edit')
  updateRoom(
    @CurrentUser() admin: { id: string },
    @Param('roomId') roomId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.approvalsService.updateRoom(roomId, admin.id, body);
  }

  @Post('rooms/:roomId/images')
  @UseInterceptors(FilesInterceptor('photos', 8, { fileFilter: imageFileFilter, limits: IMAGE_LIMIT }))
  addRoomImages(
    @CurrentUser() admin: { id: string },
    @Param('roomId') roomId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.approvalsService.addRoomImages(roomId, admin.id, files ?? []);
  }

  @Delete('rooms/:roomId/images/:index')
  removeRoomImage(
    @CurrentUser() admin: { id: string },
    @Param('roomId') roomId: string,
    @Param('index') index: string,
  ) {
    return this.approvalsService.removeRoomImage(roomId, admin.id, Number(index));
  }
}
