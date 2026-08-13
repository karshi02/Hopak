import { IsDateString, IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  roomId!: string;

  @IsDateString()
  checkInDate!: string;

  // วันคืนห้อง — บังคับเฉพาะเช่ารายวัน (rentalType = DAILY) ไม่ใช้กับรายเดือน
  @IsOptional()
  @IsDateString()
  checkOutDate?: string;

  @IsString()
  contactName!: string;

  // เบอร์ไทย 10 หลักขึ้นต้นด้วย 0 — ตรวจฝั่งเซิร์ฟเวอร์ด้วย ไม่พึ่งหน้าเว็บอย่างเดียว
  // (ยิง API ตรงก็ยังต้องผ่านกฎเดียวกัน) เจ้าของหอต้องโทรกลับหาผู้เช่าได้จริง
  @IsString()
  @Matches(/^0\d{9}$/, { message: 'เบอร์โทรต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 0' })
  contactPhone!: string;

  @IsOptional()
  @IsString()
  note?: string;

  // รูปแบบการเช่า — default รายเดือน (คงพฤติกรรมเดิมถ้าไม่ส่งมา)
  @IsOptional()
  @IsIn(['MONTHLY', 'DAILY'])
  rentalType?: 'MONTHLY' | 'DAILY';

  // จำนวนผู้เข้าพัก (เฉพาะรายวัน) — เจ้าของหอใช้เตรียมห้อง
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  guests?: number;

  // ระยะเวลาเช่า (เดือน) — 1/3/6 เท่านั้น (เฉพาะรายเดือน)
  @IsOptional()
  @IsInt()
  @IsIn([1, 3, 6])
  leaseMonths?: number;
}
