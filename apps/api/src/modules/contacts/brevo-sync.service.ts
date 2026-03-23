import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BrevoSyncService {
  private readonly logger = new Logger(BrevoSyncService.name);

  constructor(private readonly configService: ConfigService) {}

  async syncContactToBrevo(
    email: string,
    firstName: string,
    lastName: string,
  ): Promise<void> {
    const apiKey = this.configService.get('BREVO_API_KEY');
    if (!apiKey) {
      this.logger.warn('BREVO_API_KEY not configured, skipping sync');
      return;
    }
    // TODO: Implement Brevo API call in Phase 6
    this.logger.log(`[STUB] Would sync contact ${email} to Brevo`);
  }

  async syncAllToBrevo(): Promise<{ synced: number; errors: number }> {
    const apiKey = this.configService.get('BREVO_API_KEY');
    if (!apiKey) {
      this.logger.warn('BREVO_API_KEY not configured, skipping sync');
      return { synced: 0, errors: 0 };
    }
    // TODO: Implement full sync in Phase 6
    this.logger.log('[STUB] Would sync all contacts to Brevo');
    return { synced: 0, errors: 0 };
  }

  async syncFromBrevo(): Promise<{ imported: number; updated: number }> {
    const apiKey = this.configService.get('BREVO_API_KEY');
    if (!apiKey) {
      this.logger.warn('BREVO_API_KEY not configured, skipping sync');
      return { imported: 0, updated: 0 };
    }
    // TODO: Implement pull from Brevo in Phase 6
    this.logger.log('[STUB] Would pull contacts from Brevo');
    return { imported: 0, updated: 0 };
  }
}
