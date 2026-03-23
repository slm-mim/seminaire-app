import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BrevoSyncService {
  private readonly logger = new Logger(BrevoSyncService.name);
  private readonly apiUrl = 'https://api.brevo.com/v3';

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

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

  async syncContactToBrevo(
    email: string,
    firstName: string,
    lastName: string,
  ): Promise<void> {
    if (!this.apiKey) {
      this.logger.warn('BREVO_API_KEY not configured, skipping sync');
      return;
    }

    try {
      await this.brevoRequest('POST', '/contacts', {
        email,
        attributes: { PRENOM: firstName, NOM: lastName },
        updateEnabled: true,
      });
      this.logger.log(`Synced contact ${email} to Brevo`);
    } catch (error) {
      this.logger.error(`Failed to sync ${email} to Brevo`, error);
    }
  }

  async syncAllToBrevo(): Promise<{ synced: number; errors: number }> {
    if (!this.apiKey) return { synced: 0, errors: 0 };

    const contacts = await this.prisma.contact.findMany();
    let synced = 0;
    let errors = 0;

    for (const contact of contacts) {
      try {
        await this.syncContactToBrevo(
          contact.email,
          contact.firstName,
          contact.lastName,
        );

        if (!contact.brevoId) {
          try {
            const brevoContact = await this.brevoRequest(
              'GET',
              `/contacts/${encodeURIComponent(contact.email)}`,
            );
            if (brevoContact?.id) {
              await this.prisma.contact.update({
                where: { id: contact.id },
                data: { brevoId: String(brevoContact.id) },
              });
            }
          } catch {
            // Contact may not exist in Brevo yet
          }
        }
        synced++;
      } catch {
        errors++;
      }
    }

    return { synced, errors };
  }

  async syncFromBrevo(): Promise<{ imported: number; updated: number }> {
    if (!this.apiKey) return { imported: 0, updated: 0 };

    let imported = 0;
    let updated = 0;
    let offset = 0;
    const limit = 50;

    try {
      while (true) {
        const data = await this.brevoRequest(
          'GET',
          `/contacts?limit=${limit}&offset=${offset}`,
        );
        if (!data?.contacts?.length) break;

        for (const brevoContact of data.contacts) {
          const email = brevoContact.email;
          const firstName = brevoContact.attributes?.PRENOM || '';
          const lastName = brevoContact.attributes?.NOM || '';

          const existing = await this.prisma.contact.findUnique({
            where: { email },
          });

          if (existing) {
            await this.prisma.contact.update({
              where: { email },
              data: { brevoId: String(brevoContact.id) },
            });
            updated++;
          } else {
            await this.prisma.contact.create({
              data: {
                email,
                firstName,
                lastName,
                city: '',
                source: 'BREVO_SYNC',
                brevoId: String(brevoContact.id),
              },
            });
            imported++;
          }
        }

        if (data.contacts.length < limit) break;
        offset += limit;
      }
    } catch (error) {
      this.logger.error('Failed to sync from Brevo', error);
    }

    return { imported, updated };
  }
}
