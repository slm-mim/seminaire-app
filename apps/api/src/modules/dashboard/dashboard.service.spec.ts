import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrismaService = {
  seminar: {
    count: jest.fn(),
    groupBy: jest.fn(),
    findMany: jest.fn(),
  },
  contact: {
    count: jest.fn(),
  },
  registration: {
    count: jest.fn(),
    groupBy: jest.fn(),
  },
};

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    jest.clearAllMocks();
  });

  describe('getOverview', () => {
    it('should return aggregated stats', async () => {
      const recentSeminars = [
        {
          id: 'seminar-1',
          title: 'Séminaire Test',
          date: new Date('2026-04-01'),
          status: 'PUBLISHED',
          _count: { registrations: 12 },
          creator: { firstName: 'Selim', lastName: 'Dupont' },
        },
      ];

      mockPrismaService.seminar.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(3);
      mockPrismaService.contact.count.mockResolvedValue(50);
      mockPrismaService.registration.count.mockResolvedValue(120);
      mockPrismaService.seminar.groupBy.mockResolvedValue([
        { status: 'PUBLISHED', _count: 6 },
        { status: 'DRAFT', _count: 3 },
        { status: 'ARCHIVED', _count: 1 },
      ]);
      mockPrismaService.seminar.findMany.mockResolvedValue(recentSeminars);

      const result = await service.getOverview();

      expect(result.totalSeminars).toBe(10);
      expect(result.upcomingSeminars).toBe(3);
      expect(result.totalContacts).toBe(50);
      expect(result.totalRegistrations).toBe(120);
      expect(result.seminarsByStatus).toEqual({
        PUBLISHED: 6,
        DRAFT: 3,
        ARCHIVED: 1,
      });
      expect(result.recentSeminars).toEqual(recentSeminars);
    });

    it('should query upcoming seminars with date gte now and status PUBLISHED', async () => {
      mockPrismaService.seminar.count.mockResolvedValue(0);
      mockPrismaService.contact.count.mockResolvedValue(0);
      mockPrismaService.registration.count.mockResolvedValue(0);
      mockPrismaService.seminar.groupBy.mockResolvedValue([]);
      mockPrismaService.seminar.findMany.mockResolvedValue([]);

      await service.getOverview();

      expect(mockPrismaService.seminar.count).toHaveBeenCalledWith({
        where: {
          date: { gte: expect.any(Date) },
          status: 'PUBLISHED',
        },
      });
    });

    it('should query recent seminars with take 5 ordered by date desc with includes', async () => {
      mockPrismaService.seminar.count.mockResolvedValue(0);
      mockPrismaService.contact.count.mockResolvedValue(0);
      mockPrismaService.registration.count.mockResolvedValue(0);
      mockPrismaService.seminar.groupBy.mockResolvedValue([]);
      mockPrismaService.seminar.findMany.mockResolvedValue([]);

      await service.getOverview();

      expect(mockPrismaService.seminar.findMany).toHaveBeenCalledWith({
        take: 5,
        orderBy: { date: 'desc' },
        include: {
          _count: { select: { registrations: true } },
          creator: { select: { firstName: true, lastName: true } },
        },
      });
    });

    it('should return empty seminarsByStatus when no seminars exist', async () => {
      mockPrismaService.seminar.count.mockResolvedValue(0);
      mockPrismaService.contact.count.mockResolvedValue(0);
      mockPrismaService.registration.count.mockResolvedValue(0);
      mockPrismaService.seminar.groupBy.mockResolvedValue([]);
      mockPrismaService.seminar.findMany.mockResolvedValue([]);

      const result = await service.getOverview();

      expect(result.seminarsByStatus).toEqual({});
      expect(result.recentSeminars).toEqual([]);
    });
  });

  describe('getAttendanceStats', () => {
    it('should return grouped registration counts with total', async () => {
      mockPrismaService.registration.groupBy.mockResolvedValue([
        { status: 'CONFIRMED', _count: 80 },
        { status: 'PENDING', _count: 25 },
        { status: 'CANCELLED', _count: 15 },
      ]);

      const result = await service.getAttendanceStats();

      expect(result).toEqual({
        total: 120,
        CONFIRMED: 80,
        PENDING: 25,
        CANCELLED: 15,
      });
    });

    it('should return total 0 when no registrations exist', async () => {
      mockPrismaService.registration.groupBy.mockResolvedValue([]);

      const result = await service.getAttendanceStats();

      expect(result.total).toBe(0);
    });

    it('should group registrations by status', async () => {
      mockPrismaService.registration.groupBy.mockResolvedValue([]);

      await service.getAttendanceStats();

      expect(mockPrismaService.registration.groupBy).toHaveBeenCalledWith({
        by: ['status'],
        _count: true,
      });
    });
  });
});
