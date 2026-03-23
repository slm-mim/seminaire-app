import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AppConfigModule } from './config/config.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SeminarsModule } from './modules/seminars/seminars.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { RegistrationsModule } from './modules/registrations/registrations.module';
import { EmailsModule } from './modules/emails/emails.module';
import { QaModule } from './modules/qa/qa.module';
import { CheckinModule } from './modules/checkin/checkin.module';
import { DriveModule } from './modules/drive/drive.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { JobsModule } from './jobs/jobs.module';
import { SentryModule } from './sentry/sentry.module';
import { SentryExceptionFilter } from './sentry/sentry.filter';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    SentryModule.register(),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),
    AuthModule,
    UsersModule,
    SeminarsModule,
    ContactsModule,
    RegistrationsModule,
    EmailsModule,
    QaModule,
    CheckinModule,
    DriveModule,
    DashboardModule,
    JobsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: SentryExceptionFilter,
    },
  ],
})
export class AppModule {}
