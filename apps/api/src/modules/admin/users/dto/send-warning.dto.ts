import { IsString, MinLength } from 'class-validator';

export class SendWarningDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @MinLength(1)
  message!: string;
}
