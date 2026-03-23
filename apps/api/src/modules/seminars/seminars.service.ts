import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { SeminarStatus, RegistrationStatus } from 'shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSeminarInput, UpdateSeminarInput } from 'validation';
import { JobsService } from '../../jobs/jobs.service';

@Injectable()
export class SeminarsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => JobsService))
    private readonly jobsService: JobsService,
  ) {}

  async findAll(status?: SeminarStatus) {
    return this.prisma.seminar.findMany({
      where: status ? { status } : undefined,
      orderBy: { date: 'desc' },
      include: {
        creator: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async findById(id: string) {
    const seminar = await this.prisma.seminar.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { registrations: true } },
      },
    });
    if (!seminar) throw new NotFoundException('Séminaire non trouvé');
    return seminar;
  }

  async findPublicById(id: string) {
    const seminar = await this.prisma.seminar.findUnique({
      where: { id, status: SeminarStatus.PUBLISHED },
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
    if (!seminar) throw new NotFoundException('Séminaire non trouvé');
    return seminar;
  }

  async create(data: CreateSeminarInput, userId: string) {
    return this.prisma.seminar.create({
      data: {
        ...data,
        price: data.price,
        date: new Date(data.date),
        status: SeminarStatus.DRAFT,
        createdBy: userId,
      },
    });
  }

  async update(id: string, data: UpdateSeminarInput) {
    await this.findById(id); // throws if not found
    return this.prisma.seminar.update({
      where: { id },
      data: {
        ...data,
        ...(data.date ? { date: new Date(data.date) } : {}),
      },
    });
  }

  async updateStatus(id: string, newStatus: SeminarStatus) {
    const seminar = await this.findById(id);

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      [SeminarStatus.DRAFT]: [SeminarStatus.PUBLISHED],
      [SeminarStatus.PUBLISHED]: [SeminarStatus.CLOSED],
      [SeminarStatus.CLOSED]: [
        SeminarStatus.PUBLISHED,
        SeminarStatus.COMPLETED,
      ],
      [SeminarStatus.COMPLETED]: [],
    };

    const allowed = validTransitions[seminar.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Transition de "${seminar.status}" vers "${newStatus}" non autorisée`,
      );
    }

    const updated = await this.prisma.seminar.update({
      where: { id },
      data: { status: newStatus },
    });

    if (newStatus === SeminarStatus.PUBLISHED) {
      const seminarDate = new Date(seminar.date);

      // Schedule reminder: seminar.date minus reminderDays days
      const reminderDate = new Date(seminarDate);
      reminderDate.setDate(reminderDate.getDate() - seminar.reminderDays);
      await this.jobsService.scheduleReminder(id, reminderDate);

      // Schedule registration close: seminar.date minus registrationDeadline hours
      const closeDate = new Date(seminarDate);
      closeDate.setHours(closeDate.getHours() - seminar.registrationDeadline);
      await this.jobsService.scheduleRegistrationClose(id, closeDate);
    }

    return updated;
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.seminar.delete({ where: { id } });
    return { message: 'Séminaire supprimé' };
  }

  async getStats(id: string) {
    await this.findById(id);
    const registrations = await this.prisma.registration.groupBy({
      by: ['status'],
      where: { seminarId: id },
      _count: true,
    });

    const stats = {
      total: 0,
      registered: 0,
      present: 0,
      absent: 0,
    };

    for (const r of registrations) {
      stats.total += r._count;
      if (r.status === RegistrationStatus.REGISTERED)
        stats.registered = r._count;
      if (r.status === RegistrationStatus.PRESENT) stats.present = r._count;
      if (r.status === RegistrationStatus.ABSENT) stats.absent = r._count;
    }

    return stats;
  }
}
