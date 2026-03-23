import { Module } from '@nestjs/common';
import { SeminarsService } from './seminars.service';
import { SeminarsController } from './seminars.controller';

@Module({
  controllers: [SeminarsController],
  providers: [SeminarsService],
  exports: [SeminarsService],
})
export class SeminarsModule {}
