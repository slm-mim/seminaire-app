import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SeminarStatus, RegistrationStatus } from 'shared-types';
import { SeminarsService } from './seminars.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JobsService } from '../../jobs/jobs.service';

const mockSeminar = {
  id: 'seminar-uuid-1',
  title: 'Test Seminar',
  description: 'A test seminar',
  speaker: 'John Doe',
  price: 100,
  date: new Date('2026-06-01T10:00:00Z'),
  location: 'Paris',
  image: null,
  registrationDeadline: 24,
  reminderDays: 3,
  status: SeminarStatus.DRAFT,
  createdBy: 'user-uuid-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  creator: { id: 'user-uuid-1', firstName: 'Admin', lastName: 'User' },
  _count: { registrations: 0 },
};

const mockJobsService = {
  scheduleReminder: jest.fn().mockResolvedValue(undefined),
  scheduleRegistrationClose: jest.fn().mockResolvedValue(undefined),
  cancelReminder: jest.fn().mockResolvedValue(undefined),
  cancelRegistrationClose: jest.fn().mockResolvedValue(undefined),
};

const mockPrismaService = {
  seminar: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  registration: {
    groupBy: jest.fn(),
  },
};

describe('SeminarsService', () => {
  let service: SeminarsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeminarsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JobsService, useValue: mockJobsService },
      ],
    }).compile();

    service = module.get<SeminarsService>(SeminarsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all seminars when no status filter is provided', async () => {
      mockPrismaService.seminar.findMany.mockResolvedValue([mockSeminar]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockSeminar);
      expect(mockPrismaService.seminar.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { date: 'desc' },
        include: {
          creator: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    });

    it('should filter seminars by status when provided', async () => {
      mockPrismaService.seminar.findMany.mockResolvedValue([mockSeminar]);

      await service.findAll(SeminarStatus.PUBLISHED);

      expect(mockPrismaService.seminar.findMany).toHaveBeenCalledWith({
        where: { status: SeminarStatus.PUBLISHED },
        orderBy: { date: 'desc' },
        include: {
          creator: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    });
  });

  describe('findById', () => {
    it('should return a seminar when found', async () => {
      mockPrismaService.seminar.findUnique.mockResolvedValue(mockSeminar);

      const result = await service.findById('seminar-uuid-1');

      expect(result).toEqual(mockSeminar);
      expect(mockPrismaService.seminar.findUnique).toHaveBeenCalledWith({
        where: { id: 'seminar-uuid-1' },
        include: {
          creator: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { registrations: true } },
        },
      });
    });

    it('should throw NotFoundException when seminar is not found', async () => {
      mockPrismaService.seminar.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findById('nonexistent-id')).rejects.toThrow(
        'Séminaire non trouvé',
      );
    });
  });

  describe('create', () => {
    it('should create a seminar with DRAFT status', async () => {
      const input = {
        title: 'New Seminar',
        description: 'Description',
        speaker: 'Jane Doe',
        price: 50,
        date: '2026-07-01T10:00:00Z',
        location: 'Lyon',
        registrationDeadline: 24,
        reminderDays: 3,
      };

      const createdSeminar = {
        ...mockSeminar,
        ...input,
        date: new Date(input.date),
        status: SeminarStatus.DRAFT,
      };

      mockPrismaService.seminar.create.mockResolvedValue(createdSeminar);

      const result = await service.create(input, 'user-uuid-1');

      expect(result.status).toBe(SeminarStatus.DRAFT);
      expect(mockPrismaService.seminar.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'New Seminar',
          status: SeminarStatus.DRAFT,
          createdBy: 'user-uuid-1',
          date: new Date(input.date),
        }),
      });
    });
  });

  describe('updateStatus', () => {
    it('should transition from DRAFT to PUBLISHED', async () => {
      mockPrismaService.seminar.findUnique.mockResolvedValue(mockSeminar);
      const updatedSeminar = {
        ...mockSeminar,
        status: SeminarStatus.PUBLISHED,
      };
      mockPrismaService.seminar.update.mockResolvedValue(updatedSeminar);

      const result = await service.updateStatus(
        'seminar-uuid-1',
        SeminarStatus.PUBLISHED,
      );

      expect(result.status).toBe(SeminarStatus.PUBLISHED);
      expect(mockPrismaService.seminar.update).toHaveBeenCalledWith({
        where: { id: 'seminar-uuid-1' },
        data: { status: SeminarStatus.PUBLISHED },
      });
    });

    it('should throw BadRequestException for invalid transition COMPLETED → DRAFT', async () => {
      const completedSeminar = {
        ...mockSeminar,
        status: SeminarStatus.COMPLETED,
      };
      mockPrismaService.seminar.findUnique.mockResolvedValue(completedSeminar);

      await expect(
        service.updateStatus('seminar-uuid-1', SeminarStatus.DRAFT),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateStatus('seminar-uuid-1', SeminarStatus.DRAFT),
      ).rejects.toThrow('non autorisée');
    });

    it('should throw BadRequestException for invalid transition DRAFT → CLOSED', async () => {
      mockPrismaService.seminar.findUnique.mockResolvedValue(mockSeminar);

      await expect(
        service.updateStatus('seminar-uuid-1', SeminarStatus.CLOSED),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow CLOSED → PUBLISHED transition', async () => {
      const closedSeminar = { ...mockSeminar, status: SeminarStatus.CLOSED };
      mockPrismaService.seminar.findUnique.mockResolvedValue(closedSeminar);
      const updatedSeminar = {
        ...mockSeminar,
        status: SeminarStatus.PUBLISHED,
      };
      mockPrismaService.seminar.update.mockResolvedValue(updatedSeminar);

      const result = await service.updateStatus(
        'seminar-uuid-1',
        SeminarStatus.PUBLISHED,
      );

      expect(result.status).toBe(SeminarStatus.PUBLISHED);
    });
  });

  describe('remove', () => {
    it('should delete a seminar and return a confirmation message', async () => {
      mockPrismaService.seminar.findUnique.mockResolvedValue(mockSeminar);
      mockPrismaService.seminar.delete.mockResolvedValue(mockSeminar);

      const result = await service.remove('seminar-uuid-1');

      expect(result).toEqual({ message: 'Séminaire supprimé' });
      expect(mockPrismaService.seminar.delete).toHaveBeenCalledWith({
        where: { id: 'seminar-uuid-1' },
      });
    });

    it('should throw NotFoundException when trying to remove a non-existent seminar', async () => {
      mockPrismaService.seminar.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getStats', () => {
    it('should return correct stats when registrations exist', async () => {
      mockPrismaService.seminar.findUnique.mockResolvedValue(mockSeminar);
      mockPrismaService.registration.groupBy.mockResolvedValue([
        { status: RegistrationStatus.REGISTERED, _count: 10 },
        { status: RegistrationStatus.PRESENT, _count: 7 },
        { status: RegistrationStatus.ABSENT, _count: 3 },
      ]);

      const result = await service.getStats('seminar-uuid-1');

      expect(result).toEqual({
        total: 20,
        registered: 10,
        present: 7,
        absent: 3,
      });
      expect(mockPrismaService.registration.groupBy).toHaveBeenCalledWith({
        by: ['status'],
        where: { seminarId: 'seminar-uuid-1' },
        _count: true,
      });
    });

    it('should return zeroed stats when there are no registrations', async () => {
      mockPrismaService.seminar.findUnique.mockResolvedValue(mockSeminar);
      mockPrismaService.registration.groupBy.mockResolvedValue([]);

      const result = await service.getStats('seminar-uuid-1');

      expect(result).toEqual({
        total: 0,
        registered: 0,
        present: 0,
        absent: 0,
      });
    });

    it('should throw NotFoundException when seminar does not exist', async () => {
      mockPrismaService.seminar.findUnique.mockResolvedValue(null);

      await expect(service.getStats('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return partial stats when only some statuses are present', async () => {
      mockPrismaService.seminar.findUnique.mockResolvedValue(mockSeminar);
      mockPrismaService.registration.groupBy.mockResolvedValue([
        { status: RegistrationStatus.REGISTERED, _count: 5 },
      ]);

      const result = await service.getStats('seminar-uuid-1');

      expect(result).toEqual({
        total: 5,
        registered: 5,
        present: 0,
        absent: 0,
      });
    });
  });

  describe('findPublicById', () => {
    const publicSeminar = {
      id: 'seminar-uuid-1',
      title: 'Test Seminar',
      description: 'A test seminar',
      speaker: 'John Doe',
      price: 100,
      date: new Date('2026-06-01T10:00:00Z'),
      location: 'Paris',
      image: null,
      registrationDeadline: 24,
      status: SeminarStatus.PUBLISHED,
    };

    it('should return public fields for a published seminar', async () => {
      mockPrismaService.seminar.findUnique.mockResolvedValue(publicSeminar);

      const result = await service.findPublicById('seminar-uuid-1');

      expect(result).toEqual(publicSeminar);
      expect(mockPrismaService.seminar.findUnique).toHaveBeenCalledWith({
        where: { id: 'seminar-uuid-1', status: SeminarStatus.PUBLISHED },
        select: {
          id: true,
          title: true,
          description: true,
          speaker: true,
          price: true,
          date: true,
          location: true,
          image: true,
          registrationDeadline: true,
          status: true,
        },
      });
    });

    it('should throw NotFoundException when seminar is not found or not published', async () => {
      mockPrismaService.seminar.findUnique.mockResolvedValue(null);

      await expect(service.findPublicById('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findPublicById('nonexistent-id')).rejects.toThrow(
        'Séminaire non trouvé',
      );
    });
  });
});
