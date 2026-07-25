import { MinLength } from 'class-validator';

export class FinishApplicationDto {
  @MinLength(6)
  password!: string;
}
