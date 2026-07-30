import { IsDateString, IsIn, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  roomId!: string;

  @IsDateString()
  checkInDate!: string;

  @IsString()
  contactName!: string;

  @IsString()
  contactPhone!: string;

  @IsOptional()
  @IsString()
  note?: string;

  // ระยะเวลาเช่า (เดือน) — 1/3/6 เท่านั้น
  @IsOptional()
  @IsInt()
  @IsIn([1, 3, 6])
  leaseMonths?: number;
}
