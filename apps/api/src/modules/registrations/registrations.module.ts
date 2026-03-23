import { Module } from '@nestjs/common';
import { ContactsModule } from '../contacts/contacts.module';
import { RegistrationsService } from './registrations.service';
import { RegistrationsController } from './registrations.controller';

@Module({
  imports: [ContactsModule],
  controllers: [RegistrationsController],
  providers: [RegistrationsService],
  exports: [RegistrationsService],
})
export class RegistrationsModule {}
