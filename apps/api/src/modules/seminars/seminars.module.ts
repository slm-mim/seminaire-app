import { Module, forwardRef } from '@nestjs/common';
import { SeminarsService } from './seminars.service';
import { SeminarsController } from './seminars.controller';
import { JobsModule } from '../../jobs/jobs.module';
import { DriveModule } from '../drive/drive.module';

@Module({
  imports: [forwardRef(() => JobsModule), DriveModule],
  controllers: [SeminarsController],
  providers: [SeminarsService],
  exports: [SeminarsService],
})
export class SeminarsModule {}
