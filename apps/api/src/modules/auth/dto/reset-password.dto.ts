import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(6, { message: 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร' })
  password!: string;
}
