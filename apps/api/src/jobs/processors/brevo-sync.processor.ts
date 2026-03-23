import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('brevo-sync')
export class BrevoSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(BrevoSyncProcessor.name);

  async process(_job: Job) {
    this.logger.log('[STUB] Would sync contacts with Brevo');
    // TODO: Call BrevoSyncService.syncAllToBrevo() and syncFromBrevo()
  }
}
