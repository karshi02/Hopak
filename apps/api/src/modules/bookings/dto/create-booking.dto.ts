import { IsDateString, IsOptional, IsString } from 'class-validator';

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
}
