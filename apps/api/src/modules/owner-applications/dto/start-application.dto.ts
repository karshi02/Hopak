import { IsEmail, IsOptional, IsString } from 'class-validator';

export class StartApplicationDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  // token จากวิดเจ็ต Cloudflare Turnstile — ด่านกันบอทเปิดใบสมัครรัวจนสแปมอีเมลคนอื่น
  @IsOptional()
  @IsString()
  turnstileToken?: string;
}
