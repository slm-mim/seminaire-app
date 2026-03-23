import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { ReminderProcessor } from './processors/reminder.processor';
import { RegistrationCloseProcessor } from './processors/registration-close.processor';
import { BrevoSyncProcessor } from './processors/brevo-sync.processor';
import { JobsService } from './jobs.service';
import { SeminarsModule } from '../modules/seminars/seminars.module';
import { RegistrationsModule } from '../modules/registrations/registrations.module';
import { ContactsModule } from '../modules/contacts/contacts.module';
import { EmailsModule } from '../modules/emails/emails.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get('REDIS_URL', 'redis://localhost:6379'),
        },
      }),
    }),
    BullModule.registerQueue(
      { name: 'reminders' },
      { name: 'registration-close' },
      { name: 'brevo-sync' },
    ),
    forwardRef(() => SeminarsModule),
    RegistrationsModule,
    ContactsModule,
    EmailsModule,
  ],
  providers: [
    JobsService,
    ReminderProcessor,
    RegistrationCloseProcessor,
    BrevoSyncProcessor,
  ],
  exports: [JobsService],
})
export class JobsModule {}
