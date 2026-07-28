import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { UploadsService } from './uploads.service';

// UploadsController (POST /uploads แบบ generic) ถูกลบทิ้ง — ไม่มีหน้าเว็บ/แอปไหนเรียกเลย
// และเปิดช่องให้อัปโหลดไฟล์ชนิดใดก็ได้ (.html/.svg) เสิร์ฟเป็น text/html = stored XSS
// การอัปโหลดจริงทั้งหมดไปผ่าน endpoint เฉพาะทางที่ whitelist ชนิดไฟล์ (avatar/รูปห้อง/เอกสาร)
@Module({
  controllers: [FilesController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
