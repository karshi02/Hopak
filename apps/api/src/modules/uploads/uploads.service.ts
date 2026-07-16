import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class UploadsService {
  private client = new S3Client({});

  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`;
  }
}
