import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { signFileKey } from '../../common/file-signing.util';

type Visibility = 'public' | 'private';

const PRIVATE_URL_TTL_SECONDS = 15 * 60;

@Injectable()
export class UploadsService {
  private logger = new Logger(UploadsService.name);
  private client: S3Client | null = null;

  constructor() {
    const { S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY, S3_REGION } = process.env;
    if (S3_BUCKET && S3_ACCESS_KEY && S3_SECRET_KEY) {
      this.client = new S3Client({
        region: S3_REGION || 'auto',
        credentials: { accessKeyId: S3_ACCESS_KEY, secretAccessKey: S3_SECRET_KEY },
      });
    }
  }

  private apiUrl() {
    return process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT ?? 4000}`;
  }

  // visibility 'public' คืน URL ถาวรใช้ได้เลย (รูปหอพักที่ต้องโชว์หน้าค้นหา)
  // visibility 'private' คืน "storage key" — ต้องผ่าน getPrivateUrl() ทุกครั้งที่จะแสดงผลจริง
  // (เอกสารยืนยันตัวตน/หอพัก เช่น บัตรประชาชน โฉนด ห้ามมี URL ถาวรสาธารณะ)
  async upload(key: string, body: Buffer, contentType: string, visibility: Visibility = 'public'): Promise<string> {
    if (this.client) {
      const s3Key = `${visibility}/${key}`;
      await this.client.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: s3Key,
          Body: body,
          ContentType: contentType,
        }),
      );
      return visibility === 'public' ? `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${s3Key}` : key;
    }

    // S3 ยังไม่ตั้งค่า (.env ว่าง) — เก็บไฟล์ลงดิสก์เครื่องแทน
    const root = visibility === 'public' ? 'uploads' : 'private-uploads';
    this.logger.warn(`S3 ยังไม่ตั้งค่า — เก็บไฟล์ ${key} ไว้ในเครื่อง (${root}/)`);
    const filePath = join(process.cwd(), root, key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, body);

    return visibility === 'public' ? `${this.apiUrl()}/uploads/${key}` : key;
  }

  // สร้างลิงก์ชั่วคราวสำหรับไฟล์ private (หมดอายุใน 15 นาที) — เรียกใหม่ทุกครั้งก่อนแสดงผล ห้าม cache ค่านี้ถาวร
  getPrivateUrl(key: string, ttlSeconds = PRIVATE_URL_TTL_SECONDS): string {
    return `${this.apiUrl()}/files/${signFileKey(key, ttlSeconds)}`;
  }

  // อ่านไฟล์ private กลับมาเป็น buffer — ใช้โดย FilesController หลัง verify token แล้วเท่านั้น
  async readPrivate(key: string): Promise<Buffer | null> {
    if (this.client) {
      try {
        const res = await this.client.send(
          new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: `private/${key}` }),
        );
        const bytes = await res.Body?.transformToByteArray();
        return bytes ? Buffer.from(bytes) : null;
      } catch {
        return null;
      }
    }

    try {
      return await readFile(join(process.cwd(), 'private-uploads', key));
    } catch {
      return null;
    }
  }
}
