import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { BrevoSyncService } from './brevo-sync.service';

@Module({
  imports: [ConfigModule],
  controllers: [ContactsController],
  providers: [ContactsService, BrevoSyncService],
  exports: [ContactsService, BrevoSyncService],
})
export class ContactsModule {}
