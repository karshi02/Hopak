import { IsDateString, IsIn, IsInt, IsOptional, IsString } from 'class-validator';

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

  @IsString()
  contactPhone!: string;

  @IsOptional()
  @IsString()
  note?: string;

  // รูปแบบการเช่า — default รายเดือน (คงพฤติกรรมเดิมถ้าไม่ส่งมา)
  @IsOptional()
  @IsIn(['MONTHLY', 'DAILY'])
  rentalType?: 'MONTHLY' | 'DAILY';

  // ระยะเวลาเช่า (เดือน) — 1/3/6 เท่านั้น (เฉพาะรายเดือน)
  @IsOptional()
  @IsInt()
  @IsIn([1, 3, 6])
  leaseMonths?: number;
}
