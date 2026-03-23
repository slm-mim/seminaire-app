import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ContactSource } from 'shared-types';
import { CreateContactInput, UpdateContactInput } from 'validation';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(search?: string) {
    return this.prisma.contact.findMany({
      where: search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { lastName: 'asc' },
    });
  }

  async findById(id: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id } });
    if (!contact) throw new NotFoundException('Contact non trouvé');
    return contact;
  }

  async create(data: CreateContactInput) {
    const existing = await this.prisma.contact.findUnique({
      where: { email: data.email },
    });
    if (existing) throw new ConflictException('Cet email est déjà utilisé');

    const formatted = this.formatName(data.firstName, data.lastName);

    return this.prisma.contact.create({
      data: {
        email: data.email,
        firstName: formatted.firstName,
        lastName: formatted.lastName,
        city: data.city,
        phone: data.phone,
        source: ContactSource.MANUAL,
      },
    });
  }

  async update(id: string, data: UpdateContactInput) {
    await this.findById(id);

    const updateData: Record<string, unknown> = { ...data };

    if (data.firstName !== undefined || data.lastName !== undefined) {
      const current = await this.findById(id);
      const firstName = data.firstName ?? current.firstName;
      const lastName = data.lastName ?? current.lastName;
      const formatted = this.formatName(firstName, lastName);
      updateData.firstName = formatted.firstName;
      updateData.lastName = formatted.lastName;
    }

    return this.prisma.contact.update({
      where: { id },
      data: updateData as Parameters<
        typeof this.prisma.contact.update
      >[0]['data'],
    });
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.contact.delete({ where: { id } });
    return { message: 'Contact supprimé' };
  }

  async findByEmail(email: string) {
    return this.prisma.contact.findUnique({ where: { email } });
  }

  formatName(
    firstName: string,
    lastName: string,
  ): { firstName: string; lastName: string } {
    const formattedFirst =
      firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    const formattedLast = lastName.toUpperCase();
    return { firstName: formattedFirst, lastName: formattedLast };
  }

  async importFromCsv(
    csvContent: string,
  ): Promise<{ created: number; updated: number; errors: string[] }> {
    const lines = csvContent.trim().split('\n');
    if (lines.length === 0) return { created: 0, updated: 0, errors: [] };

    // Skip header row
    const dataLines = lines.slice(1);

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i].trim();
      if (!line) continue;

      const columns = line
        .split(',')
        .map((col) => col.trim().replace(/^"|"$/g, ''));
      const [email, firstName, lastName, city, phone] = columns;

      if (!email || !firstName || !lastName || !city) {
        errors.push(
          `Ligne ${i + 2}: données manquantes (email, prénom, nom, ville requis)`,
        );
        continue;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push(`Ligne ${i + 2}: email invalide "${email}"`);
        continue;
      }

      try {
        const formatted = this.formatName(firstName, lastName);
        const existing = await this.prisma.contact.findUnique({
          where: { email },
        });

        if (existing) {
          await this.prisma.contact.update({
            where: { email },
            data: {
              firstName: formatted.firstName,
              lastName: formatted.lastName,
              city,
              phone: phone || existing.phone,
            },
          });
          updated++;
        } else {
          await this.prisma.contact.create({
            data: {
              email,
              firstName: formatted.firstName,
              lastName: formatted.lastName,
              city,
              phone: phone || undefined,
              source: ContactSource.MANUAL,
            },
          });
          created++;
        }
      } catch {
        errors.push(`Ligne ${i + 2}: erreur lors du traitement de "${email}"`);
      }
    }

    return { created, updated, errors };
  }

  async exportToCsv(): Promise<string> {
    const contacts = await this.prisma.contact.findMany({
      orderBy: { lastName: 'asc' },
    });

    const header = 'email,firstName,lastName,city,phone';
    const rows = contacts.map((c) => {
      const phone = c.phone ?? '';
      return `${c.email},${c.firstName},${c.lastName},${c.city},${phone}`;
    });

    return [header, ...rows].join('\n');
  }
}
