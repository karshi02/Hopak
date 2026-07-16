import { PartialType } from '@nestjs/mapped-types';
import { CreateDormDto } from './create-dorm.dto';

export class UpdateDormDto extends PartialType(CreateDormDto) {}
