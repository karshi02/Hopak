import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { FilesController } from './files.controller';
import { UploadsService } from './uploads.service';

@Module({
  controllers: [UploadsController, FilesController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
