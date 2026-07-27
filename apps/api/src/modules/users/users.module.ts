import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, MailService, PrismaService],
  exports: [UsersService],
})
export class UsersModule {}
