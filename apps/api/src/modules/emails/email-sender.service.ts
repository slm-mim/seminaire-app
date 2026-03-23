import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailSenderService {
  private readonly logger = new Logger(EmailSenderService.name);
  private readonly apiUrl = 'https://api.brevo.com/v3';

  constructor(private readonly configService: ConfigService) {}

  private get apiKey(): string | undefined {
    return this.configService.get('BREVO_API_KEY');
  }

  private async brevoRequest(method: string, path: string, body?: unknown) {
    if (!this.apiKey) {
      this.logger.warn('BREVO_API_KEY not configured, skipping API call');
      return null;
    }

    const response = await fetch(`${this.apiUrl}${path}`, {
      method,
      headers: {
        'api-key': this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Brevo API error: ${response.status} ${error}`);
      throw new Error(`Brevo API error: ${response.status}`);
    }

    if (response.status === 204) return null;
    return response.json();
  }

  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
  ): Promise<boolean> {
    if (!this.apiKey) {
      this.logger.warn(`[DEV] Would send email to ${to}: ${subject}`);
      return true;
    }

    try {
      await this.brevoRequest('POST', '/smtp/email', {
        sender: { name: 'Séminaires', email: 'seminaire.mf.idf@gmail.com' },
        to: [{ email: to }],
        subject,
        htmlContent,
      });
      this.logger.log(`Email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
      return false;
    }
  }

  async sendBulk(
    recipients: { email: string; firstName: string; lastName: string }[],
    subject: string,
    htmlTemplate: string,
    variables: Record<string, string>,
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    if (!this.apiKey) {
      this.logger.warn(
        `[DEV] Would send bulk email to ${recipients.length} recipients: ${subject}`,
      );
      return { sent: recipients.length, failed: 0 };
    }

    // Send in batches of 50
    for (let i = 0; i < recipients.length; i += 50) {
      const batch = recipients.slice(i, i + 50);

      for (const r of batch) {
        const personalizedHtml = htmlTemplate
          .replace(/\{nomParticipant\}/g, `${r.firstName} ${r.lastName}`)
          .replace(/\{email\}/g, r.email);

        const success = await this.sendEmail(
          r.email,
          subject,
          personalizedHtml,
        );
        if (success) sent++;
        else failed++;
      }
    }

    return { sent, failed };
  }
}
