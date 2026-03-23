import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QASessionStatus, QuestionStatus, Gender } from 'shared-types';
import { QaService } from './qa.service';
import { QaGateway } from './qa.gateway';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrismaService = {
  qASession: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  question: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
};

const mockQaGateway = {
  notifyNewQuestion: jest.fn(),
  notifyQuestionUpdate: jest.fn(),
  notifyReorder: jest.fn(),
};

describe('QaService', () => {
  let service: QaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QaService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: QaGateway, useValue: mockQaGateway },
      ],
    }).compile();

    service = module.get<QaService>(QaService);
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a session with a generated short code', async () => {
      const mockSession = {
        id: 'session-uuid',
        title: 'Test Session',
        seminarId: null,
        qrCodeUrl: '/qa/abcd1234',
        status: QASessionStatus.OPEN,
        createdAt: new Date(),
      };
      mockPrismaService.qASession.create.mockResolvedValue(mockSession);

      const result = await service.createSession('Test Session');

      expect(mockPrismaService.qASession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Test Session',
          seminarId: null,
          status: QASessionStatus.OPEN,
          qrCodeUrl: expect.stringMatching(/^\/qa\/[a-f0-9]{8}$/),
        }),
      });
      expect(result).toEqual(mockSession);
    });

    it('should create a session linked to a seminar', async () => {
      const mockSession = {
        id: 'session-uuid',
        title: 'Test Session',
        seminarId: 'seminar-uuid',
        qrCodeUrl: '/qa/abcd1234',
        status: QASessionStatus.OPEN,
        createdAt: new Date(),
      };
      mockPrismaService.qASession.create.mockResolvedValue(mockSession);

      const result = await service.createSession(
        'Test Session',
        'seminar-uuid',
      );

      expect(mockPrismaService.qASession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          seminarId: 'seminar-uuid',
        }),
      });
      expect(result).toEqual(mockSession);
    });
  });

  describe('submitQuestion', () => {
    it('should create a question with PENDING status and gender field', async () => {
      const mockSession = {
        id: 'session-uuid',
        status: QASessionStatus.OPEN,
      };
      const mockQuestion = {
        id: 'question-uuid',
        sessionId: 'session-uuid',
        content: 'Ma question?',
        authorName: 'Selim',
        gender: Gender.MALE,
        status: QuestionStatus.PENDING,
        order: 1,
        submittedAt: new Date(),
      };

      mockPrismaService.qASession.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.question.findFirst.mockResolvedValue(null);
      mockPrismaService.question.create.mockResolvedValue(mockQuestion);

      const result = await service.submitQuestion('session-uuid', {
        content: 'Ma question?',
        authorName: 'Selim',
        gender: Gender.MALE,
      });

      expect(mockPrismaService.question.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sessionId: 'session-uuid',
          content: 'Ma question?',
          authorName: 'Selim',
          gender: Gender.MALE,
          status: QuestionStatus.PENDING,
          order: 1,
        }),
      });
      expect(result.status).toBe(QuestionStatus.PENDING);
      expect(result.gender).toBe(Gender.MALE);
      expect(mockQaGateway.notifyNewQuestion).toHaveBeenCalledWith(
        'session-uuid',
        mockQuestion,
      );
    });

    it('should throw BadRequestException when session is CLOSED', async () => {
      const mockSession = {
        id: 'session-uuid',
        status: QASessionStatus.CLOSED,
      };
      mockPrismaService.qASession.findUnique.mockResolvedValue(mockSession);

      await expect(
        service.submitQuestion('session-uuid', {
          content: 'Ma question?',
          gender: Gender.FEMALE,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when session does not exist', async () => {
      mockPrismaService.qASession.findUnique.mockResolvedValue(null);

      await expect(
        service.submitQuestion('non-existent-uuid', {
          content: 'Ma question?',
          gender: Gender.MALE,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('approveQuestion', () => {
    it('should change question status to APPROVED', async () => {
      const mockQuestion = {
        id: 'question-uuid',
        sessionId: 'session-uuid',
        status: QuestionStatus.PENDING,
      };
      const updatedQuestion = {
        ...mockQuestion,
        status: QuestionStatus.APPROVED,
      };

      mockPrismaService.question.findUnique.mockResolvedValue(mockQuestion);
      mockPrismaService.question.update.mockResolvedValue(updatedQuestion);

      const result = await service.approveQuestion('question-uuid');

      expect(mockPrismaService.question.update).toHaveBeenCalledWith({
        where: { id: 'question-uuid' },
        data: { status: QuestionStatus.APPROVED },
      });
      expect(result.status).toBe(QuestionStatus.APPROVED);
      expect(mockQaGateway.notifyQuestionUpdate).toHaveBeenCalledWith(
        'session-uuid',
        updatedQuestion,
      );
    });
  });

  describe('rejectQuestion', () => {
    it('should change question status to REJECTED', async () => {
      const mockQuestion = {
        id: 'question-uuid',
        sessionId: 'session-uuid',
        status: QuestionStatus.PENDING,
      };
      const updatedQuestion = {
        ...mockQuestion,
        status: QuestionStatus.REJECTED,
      };

      mockPrismaService.question.findUnique.mockResolvedValue(mockQuestion);
      mockPrismaService.question.update.mockResolvedValue(updatedQuestion);

      const result = await service.rejectQuestion('question-uuid');

      expect(result.status).toBe(QuestionStatus.REJECTED);
      expect(mockQaGateway.notifyQuestionUpdate).toHaveBeenCalledWith(
        'session-uuid',
        updatedQuestion,
      );
    });
  });

  describe('getApprovedQuestions', () => {
    it('should return only APPROVED questions ordered by order ASC', async () => {
      const mockQuestions = [
        {
          id: 'q1',
          sessionId: 'session-uuid',
          status: QuestionStatus.APPROVED,
          order: 1,
        },
        {
          id: 'q2',
          sessionId: 'session-uuid',
          status: QuestionStatus.APPROVED,
          order: 2,
        },
      ];

      mockPrismaService.question.findMany.mockResolvedValue(mockQuestions);

      const result = await service.getApprovedQuestions('session-uuid');

      expect(mockPrismaService.question.findMany).toHaveBeenCalledWith({
        where: { sessionId: 'session-uuid', status: QuestionStatus.APPROVED },
        orderBy: { order: 'asc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0].order).toBe(1);
      expect(result[1].order).toBe(2);
    });
  });
});
