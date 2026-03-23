import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
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

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
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
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
