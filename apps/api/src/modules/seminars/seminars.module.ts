import { Module, forwardRef } from '@nestjs/common';
import { SeminarsService } from './seminars.service';
import { SeminarsController } from './seminars.controller';
import { JobsModule } from '../../jobs/jobs.module';

@Module({
  imports: [forwardRef(() => JobsModule)],
  controllers: [SeminarsController],
  providers: [SeminarsService],
  exports: [SeminarsService],
})
export class SeminarsModule {}
