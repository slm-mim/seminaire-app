import { Module } from '@nestjs/common';
import { QaController } from './qa.controller';
import { QaService } from './qa.service';
import { QaGateway } from './qa.gateway';

@Module({
  controllers: [QaController],
  providers: [QaService, QaGateway],
  exports: [QaService],
})
export class QaModule {}
