import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { QASessionStatus, QuestionStatus } from 'shared-types';
import { SubmitQuestionInput } from 'validation';
import { PrismaService } from '../../prisma/prisma.service';
import { QaGateway } from './qa.gateway';

@Injectable()
export class QaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qaGateway: QaGateway,
  ) {}

  async createSession(title: string, seminarId?: string) {
    const shortCode = randomBytes(4).toString('hex');
    const qrCodeUrl = `/qa/${shortCode}`;

    return this.prisma.qASession.create({
      data: {
        title,
        seminarId: seminarId ?? null,
        qrCodeUrl,
        status: QASessionStatus.OPEN,
      },
    });
  }

  async findSessionById(id: string) {
    const session = await this.prisma.qASession.findUnique({
      where: { id },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    if (!session) throw new NotFoundException('Session Q&A non trouvée');
    return session;
  }

  async findSessionByCode(code: string) {
    const session = await this.prisma.qASession.findFirst({
      where: { qrCodeUrl: `/qa/${code}` },
    });
    if (!session) throw new NotFoundException('Session Q&A non trouvée');
    return session;
  }

  async openSession(id: string) {
    await this.findSessionById(id);
    return this.prisma.qASession.update({
      where: { id },
      data: { status: QASessionStatus.OPEN },
    });
  }

  async closeSession(id: string) {
    await this.findSessionById(id);
    return this.prisma.qASession.update({
      where: { id },
      data: { status: QASessionStatus.CLOSED },
    });
  }

  async findAll() {
    return this.prisma.qASession.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { questions: true } } },
    });
  }

  async findSessionBySeminar(seminarId: string) {
    return this.prisma.qASession.findUnique({
      where: { seminarId },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
  }

  async submitQuestion(sessionId: string, data: SubmitQuestionInput) {
    const session = await this.prisma.qASession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session Q&A non trouvée');
    if (session.status === QASessionStatus.CLOSED) {
      throw new BadRequestException('Cette session Q&A est fermée');
    }

    const lastQuestion = await this.prisma.question.findFirst({
      where: { sessionId },
      orderBy: { order: 'desc' },
    });
    const nextOrder = lastQuestion ? lastQuestion.order + 1 : 1;

    const question = await this.prisma.question.create({
      data: {
        sessionId,
        content: data.content,
        authorName: data.authorName ?? null,
        gender: data.gender,
        status: QuestionStatus.PENDING,
        order: nextOrder,
      },
    });

    this.qaGateway.notifyNewQuestion(sessionId, question);

    return question;
  }

  async getQuestions(sessionId: string, status?: QuestionStatus) {
    return this.prisma.question.findMany({
      where: {
        sessionId,
        ...(status ? { status } : {}),
      },
      orderBy: { order: 'asc' },
    });
  }

  async approveQuestion(id: string) {
    const question = await this.findQuestionById(id);
    const updated = await this.prisma.question.update({
      where: { id },
      data: { status: QuestionStatus.APPROVED },
    });
    this.qaGateway.notifyQuestionUpdate(question.sessionId, updated);
    return updated;
  }

  async rejectQuestion(id: string) {
    const question = await this.findQuestionById(id);
    const updated = await this.prisma.question.update({
      where: { id },
      data: { status: QuestionStatus.REJECTED },
    });
    this.qaGateway.notifyQuestionUpdate(question.sessionId, updated);
    return updated;
  }

  async markAnswered(id: string) {
    const question = await this.findQuestionById(id);
    const updated = await this.prisma.question.update({
      where: { id },
      data: { status: QuestionStatus.ANSWERED },
    });
    this.qaGateway.notifyQuestionUpdate(question.sessionId, updated);
    return updated;
  }

  async updateQuestion(id: string, content: string) {
    const question = await this.findQuestionById(id);
    const updated = await this.prisma.question.update({
      where: { id },
      data: { content },
    });
    this.qaGateway.notifyQuestionUpdate(question.sessionId, updated);
    return updated;
  }

  async reorderQuestion(id: string, newOrder: number) {
    const question = await this.findQuestionById(id);
    await this.prisma.question.update({
      where: { id },
      data: { order: newOrder },
    });
    const questions = await this.getQuestions(question.sessionId);
    this.qaGateway.notifyReorder(question.sessionId, questions);
    return questions;
  }

  async getApprovedQuestions(sessionId: string) {
    return this.prisma.question.findMany({
      where: { sessionId, status: QuestionStatus.APPROVED },
      orderBy: { order: 'asc' },
    });
  }

  private async findQuestionById(id: string) {
    const question = await this.prisma.question.findUnique({ where: { id } });
    if (!question) throw new NotFoundException('Question non trouvée');
    return question;
  }
}
