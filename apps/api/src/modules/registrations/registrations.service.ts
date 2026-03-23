import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ContactSource, RegistrationStatus, SeminarStatus } from 'shared-types';
import { RegistrationInput } from 'validation';
import { PrismaService } from '../../prisma/prisma.service';
import { ContactsService } from '../contacts/contacts.service';

@Injectable()
export class RegistrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contactsService: ContactsService,
  ) {}

  async register(seminarId: string, data: RegistrationInput) {
    // 1. Check seminar exists and is PUBLISHED
    const seminar = await this.prisma.seminar.findUnique({
      where: { id: seminarId },
    });
    if (!seminar) throw new NotFoundException('Séminaire non trouvé');
    if (seminar.status !== SeminarStatus.PUBLISHED) {
      throw new BadRequestException(
        'Les inscriptions ne sont pas ouvertes pour ce séminaire',
      );
    }

    // 2. Check registration deadline hasn't passed
    const deadlineDate = new Date(
      seminar.date.getTime() - seminar.registrationDeadline * 60 * 60 * 1000,
    );
    if (new Date() > deadlineDate) {
      throw new BadRequestException(
        "La date limite d'inscription est dépassée",
      );
    }

    // 3. Find or create contact by email
    const formatted = this.contactsService.formatName(
      data.firstName,
      data.lastName,
    );
    let contact = await this.contactsService.findByEmail(data.email);
    if (!contact) {
      contact = await this.prisma.contact.create({
        data: {
          email: data.email,
          firstName: formatted.firstName,
          lastName: formatted.lastName,
          city: data.city,
          phone: data.phone,
          source: ContactSource.REGISTRATION,
        },
      });
    }

    // 4. Check for duplicate registration
    const existing = await this.prisma.registration.findUnique({
      where: { seminarId_contactId: { seminarId, contactId: contact.id } },
    });
    if (existing) {
      throw new ConflictException('Vous êtes déjà inscrit à ce séminaire');
    }

    // 5. Create registration with status REGISTERED
    const registration = await this.prisma.registration.create({
      data: {
        seminarId,
        contactId: contact.id,
        status: RegistrationStatus.REGISTERED,
      },
      include: { contact: true },
    });

    return registration;
  }

  async addWalkIn(
    seminarId: string,
    data: { firstName: string; lastName: string; email: string },
  ) {
    const seminar = await this.prisma.seminar.findUnique({
      where: { id: seminarId },
    });
    if (!seminar) throw new NotFoundException('Séminaire non trouvé');

    const formatted = this.contactsService.formatName(
      data.firstName,
      data.lastName,
    );
    let contact = await this.contactsService.findByEmail(data.email);
    if (!contact) {
      contact = await this.prisma.contact.create({
        data: {
          email: data.email,
          firstName: formatted.firstName,
          lastName: formatted.lastName,
          city: 'Non renseigné',
          source: ContactSource.REGISTRATION,
        },
      });
    }

    const existing = await this.prisma.registration.findUnique({
      where: { seminarId_contactId: { seminarId, contactId: contact.id } },
    });
    if (existing) {
      throw new ConflictException(
        'Cette personne est déjà inscrite à ce séminaire',
      );
    }

    return this.prisma.registration.create({
      data: {
        seminarId,
        contactId: contact.id,
        status: RegistrationStatus.PRESENT,
        isWalkIn: true,
      },
      include: { contact: true },
    });
  }

  async getAttendanceList(seminarId: string) {
    const seminar = await this.prisma.seminar.findUnique({
      where: { id: seminarId },
    });
    if (!seminar) throw new NotFoundException('Séminaire non trouvé');

    const registrations = await this.prisma.registration.findMany({
      where: { seminarId },
      include: { contact: true },
      orderBy: { contact: { lastName: 'asc' } },
    });

    return registrations.map((reg) => ({
      ...reg,
      contact: {
        ...reg.contact,
        firstName:
          reg.contact.firstName.charAt(0).toUpperCase() +
          reg.contact.firstName.slice(1).toLowerCase(),
        lastName: reg.contact.lastName.toUpperCase(),
      },
    }));
  }

  async updateStatus(id: string, status: 'PRESENT' | 'ABSENT') {
    const registration = await this.prisma.registration.findUnique({
      where: { id },
    });
    if (!registration) throw new NotFoundException('Inscription non trouvée');

    return this.prisma.registration.update({
      where: { id },
      data: { status: status as RegistrationStatus },
      include: { contact: true },
    });
  }

  async getStats(seminarId: string) {
    const seminar = await this.prisma.seminar.findUnique({
      where: { id: seminarId },
    });
    if (!seminar) throw new NotFoundException('Séminaire non trouvé');

    const registrations = await this.prisma.registration.findMany({
      where: { seminarId },
    });

    const total = registrations.length;
    const registered = registrations.filter(
      (r) => r.status === RegistrationStatus.REGISTERED,
    ).length;
    const present = registrations.filter(
      (r) => r.status === RegistrationStatus.PRESENT,
    ).length;
    const absent = registrations.filter(
      (r) => r.status === RegistrationStatus.ABSENT,
    ).length;
    const walkIns = registrations.filter((r) => r.isWalkIn).length;
    const duplicates = 0; // unique constraint prevents duplicates

    return { total, registered, present, absent, walkIns, duplicates };
  }

  async closeRegistrations(seminarId: string) {
    const seminar = await this.prisma.seminar.findUnique({
      where: { id: seminarId },
    });
    if (!seminar) throw new NotFoundException('Séminaire non trouvé');

    return this.prisma.seminar.update({
      where: { id: seminarId },
      data: { status: SeminarStatus.CLOSED },
    });
  }

  async findAll(seminarId: string) {
    const seminar = await this.prisma.seminar.findUnique({
      where: { id: seminarId },
    });
    if (!seminar) throw new NotFoundException('Séminaire non trouvé');

    return this.prisma.registration.findMany({
      where: { seminarId },
      include: { contact: true },
      orderBy: { registeredAt: 'desc' },
    });
  }

  async remove(id: string) {
    const registration = await this.prisma.registration.findUnique({
      where: { id },
    });
    if (!registration) throw new NotFoundException('Inscription non trouvée');

    await this.prisma.registration.delete({ where: { id } });
    return { message: 'Inscription supprimée' };
  }
}
