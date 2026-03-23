import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Injectable,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { Response } from 'express';
import { DiscordWebhookService } from './discord-webhook.service';

@Catch()
@Injectable()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);

  constructor(private readonly discord: DiscordWebhookService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erreur interne du serveur';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();
      message =
        typeof exResponse === 'string'
          ? exResponse
          : ((exResponse as any).message ?? message);
    }

    // Only report 5xx errors to Sentry and Discord
    if (status >= 500) {
      Sentry.captureException(exception);
      this.logger.error(
        `[${status}] ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
      const error =
        exception instanceof Error ? exception : new Error(String(exception));
      void this.discord.sendErrorNotification(error, `HTTP ${status}`);
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
