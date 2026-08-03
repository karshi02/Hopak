import { BadRequestException } from '@nestjs/common';

// ตัวกรองไฟล์อัพโหลด — whitelist ทั้งนามสกุลและ MIME พร้อมกัน
// สำคัญด้านความปลอดภัย: ปฏิเสธ .svg/.html/.htm เพื่อกัน stored XSS
// (ไฟล์พวกนี้ถ้าถูกเสิร์ฟ inline จะรันสคริปต์บนโดเมนเราได้)
// หมายเหตุ: mimetype.startsWith('image/') ใช้ไม่ได้ เพราะ image/svg+xml ก็ผ่าน

type MulterCb = (err: Error | null, accept: boolean) => void;

const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const DOC_EXT = [...IMAGE_EXT, '.pdf'];
const DOC_MIME = [...IMAGE_MIME, 'application/pdf'];

function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

function makeFilter(exts: string[], mimes: string[], label: string) {
  return (_req: unknown, file: Express.Multer.File, cb: MulterCb) => {
    const ext = extOf(file.originalname);
    // ต้องผ่านทั้งนามสกุลและ MIME (กันปลอม MIME หรือปลอมนามสกุลอย่างใดอย่างหนึ่ง)
    if (exts.includes(ext) && mimes.includes(file.mimetype)) return cb(null, true);
    cb(new BadRequestException(`อนุญาตเฉพาะไฟล์ ${label} เท่านั้น`), false);
  };
}

// รูปภาพเท่านั้น — รูปหอ/ห้อง/avatar/hero/poster
export const imageFileFilter = makeFilter(IMAGE_EXT, IMAGE_MIME, 'รูปภาพ (jpg, png, gif, webp)');

// รูปภาพหรือ PDF — เอกสารยืนยันตัวตน/สลิปโอนเงิน
export const documentFileFilter = makeFilter(DOC_EXT, DOC_MIME, 'รูปภาพหรือ PDF');

// ขนาดไฟล์มาตรฐาน
export const IMAGE_LIMIT = { fileSize: 5 * 1024 * 1024 }; // 5MB
export const DOC_LIMIT = { fileSize: 10 * 1024 * 1024 }; // 10MB
