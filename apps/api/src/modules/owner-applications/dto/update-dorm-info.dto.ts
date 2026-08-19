import { IsNumber, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateDormInfoDto {
  @IsString()
  dormName!: string;

  // เบอร์ติดต่อเจ้าของหอ — กรอกในขั้นตอนข้อมูลหอ (ขั้นที่ 2) ไม่ใช่ตอนเริ่มใบสมัคร
  // เก็บเป็นตัวเลขล้วน 10 หลักขึ้นต้น 0 เท่านั้น จะได้เทียบซ้ำกับบัญชีเดิมได้ตรงๆ
  @IsOptional()
  @Matches(/^0\d{9}$/, { message: 'เบอร์โทรต้องเป็นตัวเลข 10 หลักขึ้นต้นด้วย 0' })
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsString()
  province!: string;

  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;

  @IsOptional()
  @IsString()
  note?: string;
}
