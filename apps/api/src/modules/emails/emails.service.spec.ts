import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EmailsService } from './emails.service';
import { EmailSenderService } from './email-sender.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CampaignStatus,
  CampaignType,
  EmailTemplateType,
  RecipientTarget,
} from 'shared-types';

const mockPrismaService = {
  emailTemplate: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  emailCampaign: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  seminar: {
    findUnique: jest.fn(),
  },
  contact: {
    findMany: jest.fn(),
  },
  registration: {
    findMany: jest.fn(),
  },
};

const mockEmailSenderService = {
  sendBulk: jest.fn(),
  sendEmail: jest.fn(),
};

const mockTemplate = {
  id: 'template-1',
  name: 'Invitation',
  subject: 'Invitation au séminaire {titre}',
  htmlContent:
    '<p>Bonjour {nomParticipant}, rejoignez-nous le {date} à {lieu}.</p>',
  type: EmailTemplateType.INVITATION,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSeminar = {
  id: 'seminar-1',
  title: 'NestJS Avancé',
  description: 'Un super séminaire',
  speaker: 'Jean Dupont',
  price: '99.00',
  date: new Date('2026-04-15T10:00:00Z'),
  location: 'Paris',
  image: null,
  registrationDeadline: 24,
  reminderDays: 3,
  status: 'PUBLISHED',
  driveFolder: null,
  createdBy: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('EmailsService', () => {
  let service: EmailsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailSenderService, useValue: mockEmailSenderService },
      ],
    }).compile();

    service = module.get<EmailsService>(EmailsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // --- Template tests ---

  describe('createTemplate', () => {
    it('should create a template with correct data', async () => {
      mockPrismaService.emailTemplate.create.mockResolvedValue(mockTemplate);

      const data = {
        name: 'Invitation',
        subject: 'Invitation au séminaire {titre}',
        htmlContent:
          '<p>Bonjour {nomParticipant}, rejoignez-nous le {date} à {lieu}.</p>',
        type: EmailTemplateType.INVITATION,
      };

      const result = await service.createTemplate(data);

      expect(mockPrismaService.emailTemplate.create).toHaveBeenCalledWith({
        data,
      });
      expect(result).toEqual(mockTemplate);
    });

    it('should create templates of all types', async () => {
      const types = [
        EmailTemplateType.INVITATION,
        EmailTemplateType.REMINDER,
        EmailTemplateType.POST_EVENT,
      ];

      for (const type of types) {
        const templateData = {
          name: `Template ${type}`,
          subject: `Subject for ${type}`,
          htmlContent: '<p>Content</p>',
          type,
        };
        const createdTemplate = {
          id: `template-${type}`,
          ...templateData,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockPrismaService.emailTemplate.create.mockResolvedValue(
          createdTemplate,
        );

        const result = await service.createTemplate(templateData);
        expect(result.type).toBe(type);
      }
    });
  });

  describe('findTemplateById', () => {
    it('should return a template when found', async () => {
      mockPrismaService.emailTemplate.findUnique.mockResolvedValue(
        mockTemplate,
      );

      const result = await service.findTemplateById('template-1');

      expect(result).toEqual(mockTemplate);
      expect(mockPrismaService.emailTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: 'template-1' },
      });
    });

    it('should throw NotFoundException when template not found', async () => {
      mockPrismaService.emailTemplate.findUnique.mockResolvedValue(null);

      await expect(service.findTemplateById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // --- Campaign tests ---

  describe('sendCampaign', () => {
    const mockCampaignBase = {
      id: 'campaign-1',
      seminarId: 'seminar-1',
      templateId: 'template-1',
      type: CampaignType.INVITATION,
      status: CampaignStatus.DRAFT,
      sentAt: null,
      recipientCount: 0,
      template: mockTemplate,
      seminar: mockSeminar,
    };

    it('should resolve recipients as ALL_CONTACTS and send campaign', async () => {
      const campaign = {
        ...mockCampaignBase,
        recipientTarget: RecipientTarget.ALL_CONTACTS,
      };
      mockPrismaService.emailCampaign.findUnique.mockResolvedValue(campaign);

      const contacts = [
        {
          id: 'c1',
          email: 'alice@test.com',
          firstName: 'Alice',
          lastName: 'DUPONT',
          city: 'Paris',
          phone: null,
          brevoId: null,
          source: 'MANUAL',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'c2',
          email: 'bob@test.com',
          firstName: 'Bob',
          lastName: 'MARTIN',
          city: 'Lyon',
          phone: null,
          brevoId: null,
          source: 'MANUAL',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockPrismaService.contact.findMany.mockResolvedValue(contacts);
      mockEmailSenderService.sendBulk.mockResolvedValue({ sent: 2, failed: 0 });

      const updatedCampaign = {
        ...campaign,
        status: CampaignStatus.SENT,
        recipientCount: 2,
        sentAt: new Date(),
      };
      mockPrismaService.emailCampaign.update.mockResolvedValue(updatedCampaign);

      const result = await service.sendCampaign('campaign-1');

      expect(mockPrismaService.contact.findMany).toHaveBeenCalled();
      expect(mockEmailSenderService.sendBulk).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ email: 'alice@test.com' }),
          expect.objectContaining({ email: 'bob@test.com' }),
        ]),
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
      expect(result.status).toBe(CampaignStatus.SENT);
      expect(result.recipientCount).toBe(2);
    });

    it('should resolve recipients as ALL_REGISTERED and filter by seminar', async () => {
      const campaign = {
        ...mockCampaignBase,
        recipientTarget: RecipientTarget.ALL_REGISTERED,
      };
      mockPrismaService.emailCampaign.findUnique.mockResolvedValue(campaign);

      const registrations = [
        {
          id: 'r1',
          seminarId: 'seminar-1',
          contactId: 'c1',
          status: 'REGISTERED',
          isWalkIn: false,
          registeredAt: new Date(),
          contact: {
            id: 'c1',
            email: 'alice@test.com',
            firstName: 'Alice',
            lastName: 'DUPONT',
          },
        },
      ];
      mockPrismaService.registration.findMany.mockResolvedValue(registrations);
      mockEmailSenderService.sendBulk.mockResolvedValue({ sent: 1, failed: 0 });

      const updatedCampaign = {
        ...campaign,
        status: CampaignStatus.SENT,
        recipientCount: 1,
        sentAt: new Date(),
      };
      mockPrismaService.emailCampaign.update.mockResolvedValue(updatedCampaign);

      const result = await service.sendCampaign('campaign-1');

      expect(mockPrismaService.registration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { seminarId: 'seminar-1' } }),
      );
      expect(result.recipientCount).toBe(1);
    });

    it('should resolve recipients as PRESENT_ONLY and filter by PRESENT status', async () => {
      const campaign = {
        ...mockCampaignBase,
        recipientTarget: RecipientTarget.PRESENT_ONLY,
      };
      mockPrismaService.emailCampaign.findUnique.mockResolvedValue(campaign);

      const registrations = [
        {
          id: 'r1',
          seminarId: 'seminar-1',
          contactId: 'c1',
          status: 'PRESENT',
          isWalkIn: false,
          registeredAt: new Date(),
          contact: {
            id: 'c1',
            email: 'alice@test.com',
            firstName: 'Alice',
            lastName: 'DUPONT',
          },
        },
      ];
      mockPrismaService.registration.findMany.mockResolvedValue(registrations);
      mockEmailSenderService.sendBulk.mockResolvedValue({ sent: 1, failed: 0 });

      const updatedCampaign = {
        ...campaign,
        status: CampaignStatus.SENT,
        recipientCount: 1,
        sentAt: new Date(),
      };
      mockPrismaService.emailCampaign.update.mockResolvedValue(updatedCampaign);

      await service.sendCampaign('campaign-1');

      expect(mockPrismaService.registration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { seminarId: 'seminar-1', status: 'PRESENT' },
        }),
      );
    });

    it('should throw NotFoundException when campaign not found', async () => {
      mockPrismaService.emailCampaign.findUnique.mockResolvedValue(null);

      await expect(service.sendCampaign('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update campaign status to SENT after sending', async () => {
      const campaign = {
        ...mockCampaignBase,
        recipientTarget: RecipientTarget.ALL_REGISTERED,
      };
      mockPrismaService.emailCampaign.findUnique.mockResolvedValue(campaign);
      mockPrismaService.registration.findMany.mockResolvedValue([]);
      mockEmailSenderService.sendBulk.mockResolvedValue({ sent: 0, failed: 0 });

      const updatedCampaign = {
        ...campaign,
        status: CampaignStatus.SENT,
        recipientCount: 0,
        sentAt: new Date(),
      };
      mockPrismaService.emailCampaign.update.mockResolvedValue(updatedCampaign);

      await service.sendCampaign('campaign-1');

      expect(mockPrismaService.emailCampaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'campaign-1' },
          data: expect.objectContaining({
            status: CampaignStatus.SENT,
            recipientCount: 0,
          }),
        }),
      );
    });
  });

  // --- Template variable replacement tests ---

  describe('template variable replacement', () => {
    it('should replace {titre}, {date}, {lieu}, {intervenant}, {prix} in html content', async () => {
      const campaign = {
        id: 'campaign-1',
        seminarId: 'seminar-1',
        templateId: 'template-1',
        type: CampaignType.INVITATION,
        recipientTarget: RecipientTarget.ALL_REGISTERED,
        status: CampaignStatus.DRAFT,
        sentAt: null,
        recipientCount: 0,
        template: {
          ...mockTemplate,
          subject: 'Invitation: {titre}',
          htmlContent:
            '<p>Séminaire: {titre} le {date} à {lieu} par {intervenant} pour {prix}€</p>',
        },
        seminar: mockSeminar,
      };

      mockPrismaService.emailCampaign.findUnique.mockResolvedValue(campaign);
      mockPrismaService.registration.findMany.mockResolvedValue([
        {
          id: 'r1',
          seminarId: 'seminar-1',
          contactId: 'c1',
          status: 'REGISTERED',
          isWalkIn: false,
          registeredAt: new Date(),
          contact: {
            id: 'c1',
            email: 'alice@test.com',
            firstName: 'Alice',
            lastName: 'DUPONT',
          },
        },
      ]);
      mockEmailSenderService.sendBulk.mockResolvedValue({ sent: 1, failed: 0 });
      mockPrismaService.emailCampaign.update.mockResolvedValue({
        ...campaign,
        status: CampaignStatus.SENT,
        recipientCount: 1,
      });

      await service.sendCampaign('campaign-1');

      const sendBulkCall = mockEmailSenderService.sendBulk.mock.calls[0];
      const passedHtml: string = sendBulkCall[2];
      const passedSubject: string = sendBulkCall[1];

      expect(passedHtml).not.toContain('{titre}');
      expect(passedHtml).toContain('NestJS Avancé');
      expect(passedHtml).not.toContain('{lieu}');
      expect(passedHtml).toContain('Paris');
      expect(passedHtml).not.toContain('{intervenant}');
      expect(passedHtml).toContain('Jean Dupont');
      expect(passedHtml).not.toContain('{prix}');
      expect(passedHtml).toContain('99.00');
      expect(passedSubject).toContain('NestJS Avancé');
      expect(passedSubject).not.toContain('{titre}');
    });
  });
});
