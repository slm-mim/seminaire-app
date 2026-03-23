import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/nestjs';
import { DiscordWebhookService } from './discord-webhook.service';

@Global()
@Module({})
export class SentryModule {
  static register() {
    return {
      module: SentryModule,
      providers: [
        {
          provide: 'SENTRY_INIT',
          inject: [ConfigService],
          useFactory: (config: ConfigService) => {
            const dsn = config.get('SENTRY_DSN');
            if (dsn) {
              Sentry.init({
                dsn,
                environment: config.get('NODE_ENV', 'development'),
                tracesSampleRate: 0.1,
              });
            }
          },
        },
        DiscordWebhookService,
      ],
      exports: [DiscordWebhookService],
    };
  }
}
