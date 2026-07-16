import { IsOptional, IsString } from 'class-validator';

export class SearchQueryDto {
  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  university?: string;

  @IsOptional()
  @IsString()
  lat?: string;

  @IsOptional()
  @IsString()
  lng?: string;
}
