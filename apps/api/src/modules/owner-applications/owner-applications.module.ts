import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { OwnerApplicationsController } from './owner-applications.controller';
import { OwnerApplicationsService } from './owner-applications.service';
import { MailService } from '../mail/mail.service';
import { UploadsService } from '../uploads/uploads.service';
import { PrismaService } from '../../prisma.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-secret',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [OwnerApplicationsController],
  providers: [OwnerApplicationsService, MailService, UploadsService, PrismaService],
})
export class OwnerApplicationsModule {}
