import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BrevoSyncService } from './brevo-sync.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockConfigService = {
  get: jest.fn(),
};

const mockPrismaService = {
  contact: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('BrevoSyncService', () => {
  let service: BrevoSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrevoSyncService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<BrevoSyncService>(BrevoSyncService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('syncContactToBrevo', () => {
    it('should skip sync when BREVO_API_KEY is not configured', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      await expect(
        service.syncContactToBrevo('test@test.com', 'Test', 'USER'),
      ).resolves.toBeUndefined();
    });

    it('should attempt API call when BREVO_API_KEY is configured', async () => {
      mockConfigService.get.mockReturnValue('fake-api-key');

      // fetch is not available in test env — the call will fail gracefully (error caught internally)
      await expect(
        service.syncContactToBrevo('test@test.com', 'Test', 'USER'),
      ).resolves.toBeUndefined();
    });
  });

  describe('syncAllToBrevo', () => {
    it('should return zeros when BREVO_API_KEY is not configured', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      const result = await service.syncAllToBrevo();

      expect(result).toEqual({ synced: 0, errors: 0 });
    });

    it('should sync contacts and return counts when BREVO_API_KEY is configured', async () => {
      mockConfigService.get.mockReturnValue('fake-api-key');

      const contacts = [
        {
          id: 'c1',
          email: 'alice@test.com',
          firstName: 'Alice',
          lastName: 'DUPONT',
          brevoId: null,
          city: 'Paris',
          source: 'MANUAL',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockPrismaService.contact.findMany.mockResolvedValue(contacts);

      // Mock global fetch to simulate Brevo API
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ id: 42 }),
        text: jest.fn(),
      });
      global.fetch = mockFetch;

      mockPrismaService.contact.update.mockResolvedValue({});

      const result = await service.syncAllToBrevo();

      expect(result.synced).toBe(1);
      expect(result.errors).toBe(0);

      // Restore fetch
      delete (global as unknown as Record<string, unknown>).fetch;
    });
  });

  describe('syncFromBrevo', () => {
    it('should return zeros when BREVO_API_KEY is not configured', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      const result = await service.syncFromBrevo();

      expect(result).toEqual({ imported: 0, updated: 0 });
    });

    it('should import new contacts and update existing ones', async () => {
      mockConfigService.get.mockReturnValue('fake-api-key');

      const brevoContacts = [
        {
          id: 1,
          email: 'new@test.com',
          attributes: { PRENOM: 'New', NOM: 'User' },
        },
        {
          id: 2,
          email: 'existing@test.com',
          attributes: { PRENOM: 'Existing', NOM: 'User' },
        },
      ];

      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({ contacts: brevoContacts }),
          text: jest.fn(),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({ contacts: [] }),
          text: jest.fn(),
        });
      global.fetch = mockFetch;

      mockPrismaService.contact.findUnique
        .mockResolvedValueOnce(null) // new contact
        .mockResolvedValueOnce({
          id: 'existing-id',
          email: 'existing@test.com',
        }); // existing contact
      mockPrismaService.contact.create.mockResolvedValue({});
      mockPrismaService.contact.update.mockResolvedValue({});

      const result = await service.syncFromBrevo();

      expect(result.imported).toBe(1);
      expect(result.updated).toBe(1);

      delete (global as unknown as Record<string, unknown>).fetch;
    });
  });
});
