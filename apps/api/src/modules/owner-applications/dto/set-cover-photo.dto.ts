import { IsString } from 'class-validator';

export class SetCoverPhotoDto {
  @IsString()
  url!: string;
}
