import { Module } from '@nestjs/common';
import { RegistrationsModule } from '../registrations/registrations.module';
import { CheckinController } from './checkin.controller';

@Module({
  imports: [RegistrationsModule],
  controllers: [CheckinController],
})
export class CheckinModule {}
