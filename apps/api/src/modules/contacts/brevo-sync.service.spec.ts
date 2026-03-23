import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BrevoSyncService } from './brevo-sync.service';

const mockConfigService = {
  get: jest.fn(),
};

describe('BrevoSyncService', () => {
  let service: BrevoSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrevoSyncService,
        { provide: ConfigService, useValue: mockConfigService },
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

    it('should log stub message when BREVO_API_KEY is configured', async () => {
      mockConfigService.get.mockReturnValue('fake-api-key');

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

    it('should return zeros stub when BREVO_API_KEY is configured', async () => {
      mockConfigService.get.mockReturnValue('fake-api-key');

      const result = await service.syncAllToBrevo();

      expect(result).toEqual({ synced: 0, errors: 0 });
    });
  });

  describe('syncFromBrevo', () => {
    it('should return zeros when BREVO_API_KEY is not configured', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      const result = await service.syncFromBrevo();

      expect(result).toEqual({ imported: 0, updated: 0 });
    });

    it('should return zeros stub when BREVO_API_KEY is configured', async () => {
      mockConfigService.get.mockReturnValue('fake-api-key');

      const result = await service.syncFromBrevo();

      expect(result).toEqual({ imported: 0, updated: 0 });
    });
  });
});
