import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateDormDto {
  @IsString()
  name!: string;

  @IsString()
  description!: string;

  @IsString()
  province!: string;

  @IsOptional()
  @IsString()
  university?: string;

  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;

  @IsNumber()
  waterRate!: number;

  @IsNumber()
  electricRate!: number;

  @IsNumber()
  deposit!: number;

  @IsArray()
  amenities!: string[];

  @IsArray()
  images!: string[];
}
