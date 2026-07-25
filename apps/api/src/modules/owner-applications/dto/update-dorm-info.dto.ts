import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateDormInfoDto {
  @IsString()
  dormName!: string;

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
