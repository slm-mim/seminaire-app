import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DiscordWebhookService {
  private readonly logger = new Logger(DiscordWebhookService.name);
  private readonly webhookUrl: string | undefined;

  constructor(config: ConfigService) {
    this.webhookUrl = config.get('DISCORD_WEBHOOK_URL');
  }

  async sendErrorNotification(error: Error, context?: string) {
    if (!this.webhookUrl) return;

    try {
      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [
            {
              title: '🚨 Erreur serveur',
              description: error.message.substring(0, 2000),
              color: 0xff0000,
              fields: [
                { name: 'Contexte', value: context || 'N/A', inline: true },
                {
                  name: 'Timestamp',
                  value: new Date().toISOString(),
                  inline: true,
                },
              ],
              footer: { text: 'Séminaire App — Sentry' },
            },
          ],
        }),
      });
    } catch (e) {
      this.logger.error('Failed to send Discord notification', e);
    }
  }
}
