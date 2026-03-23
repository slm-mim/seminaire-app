import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailSenderService {
  private readonly logger = new Logger(EmailSenderService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
  ): Promise<boolean> {
    const apiKey = this.configService.get('BREVO_API_KEY');
    if (!apiKey) {
      this.logger.warn(`[DEV] Would send email to ${to}: ${subject}`);
      return true;
    }
    // TODO: Implement Brevo API call
    this.logger.log(`[STUB] Sending email to ${to}`);
    return true;
  }

  async sendBulk(
    recipients: { email: string; firstName: string; lastName: string }[],
    subject: string,
    htmlTemplate: string,
    variables: Record<string, string>,
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;
    for (const r of recipients) {
      const personalizedHtml = htmlTemplate
        .replace(/\{nomParticipant\}/g, `${r.firstName} ${r.lastName}`)
        .replace(/\{email\}/g, r.email);
      const success = await this.sendEmail(r.email, subject, personalizedHtml);
      if (success) sent++;
      else failed++;
    }
    return { sent, failed };
  }
}
