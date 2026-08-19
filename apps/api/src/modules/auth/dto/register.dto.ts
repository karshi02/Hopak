import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @MinLength(6)
  password!: string;

  // token จากวิดเจ็ต Cloudflare Turnstile — บังคับเมื่อฝั่งเซิร์ฟเวอร์ตั้ง TURNSTILE_SECRET_KEY ไว้
  @IsOptional()
  @IsString()
  turnstileToken?: string;
}


