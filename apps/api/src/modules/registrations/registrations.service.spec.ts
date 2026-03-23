import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { RegistrationStatus, SeminarStatus, ContactSource } from 'shared-types';
import { RegistrationsService } from './registrations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ContactsService } from '../contacts/contacts.service';

const mockContact = {
  id: 'contact-1',
  email: 'jean.dupont@example.com',
  firstName: 'Jean',
  lastName: 'DUPONT',
  city: 'Paris',
  phone: null,
  brevoId: null,
  source: ContactSource.REGISTRATION,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

const mockSeminar = {
  id: 'seminar-1',
  title: 'Test Seminar',
  description: 'A test seminar',
  speaker: 'Speaker Name',
  price: 0,
  date: tomorrow,
  location: 'Paris',
  image: null,
  registrationDeadline: 1, // 1 hour before
  reminderDays: 7,
  status: SeminarStatus.PUBLISHED,
  driveFolder: null,
  createdBy: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockRegistration = {
  id: 'reg-1',
  seminarId: 'seminar-1',
  contactId: 'contact-1',
  status: RegistrationStatus.REGISTERED,
  isWalkIn: false,
  registeredAt: new Date(),
  contact: mockContact,
};

describe('RegistrationsService', () => {
  let service: RegistrationsService;
  let prisma: jest.Mocked<PrismaService>;
  let contactsService: jest.Mocked<ContactsService>;

  beforeEach(async () => {
    const mockPrisma = {
      seminar: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      contact: {
        create: jest.fn(),
      },
      registration: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const mockContactsService = {
      findByEmail: jest.fn(),
      formatName: jest
        .fn()
        .mockReturnValue({ firstName: 'Jean', lastName: 'DUPONT' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ContactsService, useValue: mockContactsService },
      ],
    }).compile();

    service = module.get<RegistrationsService>(RegistrationsService);
    prisma = module.get(PrismaService);
    contactsService = module.get(ContactsService);
  });

  describe('register', () => {
    const registrationInput = {
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean.dupont@example.com',
      city: 'Paris',
      phone: undefined,
      consent: true as const,
    };

    it('should create a registration for a published seminar', async () => {
      (prisma.seminar.findUnique as jest.Mock).mockResolvedValue(mockSeminar);
      (contactsService.findByEmail as jest.Mock).mockResolvedValue(mockContact);
      (prisma.registration.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.registration.create as jest.Mock).mockResolvedValue(
        mockRegistration,
      );

      const result = await service.register('seminar-1', registrationInput);

      expect(result).toEqual(mockRegistration);
      expect(prisma.registration.create).toHaveBeenCalledWith({
        data: {
          seminarId: 'seminar-1',
          contactId: 'contact-1',
          status: RegistrationStatus.REGISTERED,
        },
        include: { contact: true },
      });
    });

    it('should create a new contact if not found by email', async () => {
      (prisma.seminar.findUnique as jest.Mock).mockResolvedValue(mockSeminar);
      (contactsService.findByEmail as jest.Mock).mockResolvedValue(null);
      (prisma.contact.create as jest.Mock).mockResolvedValue(mockContact);
      (prisma.registration.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.registration.create as jest.Mock).mockResolvedValue(
        mockRegistration,
      );

      await service.register('seminar-1', registrationInput);

      expect(prisma.contact.create).toHaveBeenCalledWith({
        data: {
          email: registrationInput.email,
          firstName: 'Jean',
          lastName: 'DUPONT',
          city: registrationInput.city,
          phone: registrationInput.phone,
          source: ContactSource.REGISTRATION,
        },
      });
    });

    it('should throw BadRequestException if seminar is not published', async () => {
      (prisma.seminar.findUnique as jest.Mock).mockResolvedValue({
        ...mockSeminar,
        status: SeminarStatus.DRAFT,
      });

      await expect(
        service.register('seminar-1', registrationInput),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if seminar is CLOSED', async () => {
      (prisma.seminar.findUnique as jest.Mock).mockResolvedValue({
        ...mockSeminar,
        status: SeminarStatus.CLOSED,
      });

      await expect(
        service.register('seminar-1', registrationInput),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if registration deadline has passed', async () => {
      const pastSeminar = {
        ...mockSeminar,
        date: new Date(Date.now() + 30 * 60 * 1000), // 30 min from now
        registrationDeadline: 2, // 2 hours before -> deadline already passed
      };
      (prisma.seminar.findUnique as jest.Mock).mockResolvedValue(pastSeminar);

      await expect(
        service.register('seminar-1', registrationInput),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if already registered', async () => {
      (prisma.seminar.findUnique as jest.Mock).mockResolvedValue(mockSeminar);
      (contactsService.findByEmail as jest.Mock).mockResolvedValue(mockContact);
      (prisma.registration.findUnique as jest.Mock).mockResolvedValue(
        mockRegistration,
      );

      await expect(
        service.register('seminar-1', registrationInput),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if seminar does not exist', async () => {
      (prisma.seminar.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.register('non-existent', registrationInput),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addWalkIn', () => {
    const walkInData = {
      firstName: 'Marie',
      lastName: 'Martin',
      email: 'marie.martin@example.com',
    };

    it('should create a walk-in with PRESENT status', async () => {
      (prisma.seminar.findUnique as jest.Mock).mockResolvedValue(mockSeminar);
      (contactsService.findByEmail as jest.Mock).mockResolvedValue(null);
      (contactsService.formatName as jest.Mock).mockReturnValue({
        firstName: 'Marie',
        lastName: 'MARTIN',
      });
      (prisma.contact.create as jest.Mock).mockResolvedValue({
        ...mockContact,
        id: 'contact-2',
        email: walkInData.email,
        firstName: 'Marie',
        lastName: 'MARTIN',
      });
      (prisma.registration.findUnique as jest.Mock).mockResolvedValue(null);

      const walkInRegistration = {
        id: 'reg-2',
        seminarId: 'seminar-1',
        contactId: 'contact-2',
        status: RegistrationStatus.PRESENT,
        isWalkIn: true,
        registeredAt: new Date(),
        contact: {
          ...mockContact,
          id: 'contact-2',
          firstName: 'Marie',
          lastName: 'MARTIN',
        },
      };
      (prisma.registration.create as jest.Mock).mockResolvedValue(
        walkInRegistration,
      );

      const result = await service.addWalkIn('seminar-1', walkInData);

      expect(result.isWalkIn).toBe(true);
      expect(result.status).toBe(RegistrationStatus.PRESENT);
      expect(prisma.registration.create).toHaveBeenCalledWith({
        data: {
          seminarId: 'seminar-1',
          contactId: 'contact-2',
          status: RegistrationStatus.PRESENT,
          isWalkIn: true,
        },
        include: { contact: true },
      });
    });
  });

  describe('getAttendanceList', () => {
    it('should return registrations with formatted names', async () => {
      (prisma.seminar.findUnique as jest.Mock).mockResolvedValue(mockSeminar);
      (prisma.registration.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockRegistration,
          contact: {
            ...mockContact,
            firstName: 'jean',
            lastName: 'dupont',
          },
        },
      ]);

      const result = await service.getAttendanceList('seminar-1');

      expect(result).toHaveLength(1);
      expect(result[0].contact.firstName).toBe('Jean');
      expect(result[0].contact.lastName).toBe('DUPONT');
    });

    it('should order by lastName ascending', async () => {
      (prisma.seminar.findUnique as jest.Mock).mockResolvedValue(mockSeminar);
      (prisma.registration.findMany as jest.Mock).mockResolvedValue([]);

      await service.getAttendanceList('seminar-1');

      expect(prisma.registration.findMany).toHaveBeenCalledWith({
        where: { seminarId: 'seminar-1' },
        include: { contact: true },
        orderBy: { contact: { lastName: 'asc' } },
      });
    });
  });

  describe('updateStatus', () => {
    it('should update registration status to PRESENT', async () => {
      (prisma.registration.findUnique as jest.Mock).mockResolvedValue(
        mockRegistration,
      );
      (prisma.registration.update as jest.Mock).mockResolvedValue({
        ...mockRegistration,
        status: RegistrationStatus.PRESENT,
      });

      const result = await service.updateStatus('reg-1', 'PRESENT');

      expect(result.status).toBe(RegistrationStatus.PRESENT);
      expect(prisma.registration.update).toHaveBeenCalledWith({
        where: { id: 'reg-1' },
        data: { status: RegistrationStatus.PRESENT },
        include: { contact: true },
      });
    });

    it('should update registration status to ABSENT', async () => {
      (prisma.registration.findUnique as jest.Mock).mockResolvedValue(
        mockRegistration,
      );
      (prisma.registration.update as jest.Mock).mockResolvedValue({
        ...mockRegistration,
        status: RegistrationStatus.ABSENT,
      });

      const result = await service.updateStatus('reg-1', 'ABSENT');

      expect(result.status).toBe(RegistrationStatus.ABSENT);
    });

    it('should throw NotFoundException if registration does not exist', async () => {
      (prisma.registration.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateStatus('non-existent', 'PRESENT'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
