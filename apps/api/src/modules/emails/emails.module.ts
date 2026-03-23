import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailsService } from './emails.service';
import { EmailsController } from './emails.controller';
import { EmailSenderService } from './email-sender.service';

@Module({
  imports: [ConfigModule],
  controllers: [EmailsController],
  providers: [EmailsService, EmailSenderService],
  exports: [EmailsService],
})
export class EmailsModule {}
