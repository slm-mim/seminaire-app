import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';

@Processor('reminders')
export class ReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(ReminderProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<{ seminarId: string }>) {
    const { seminarId } = job.data;
    this.logger.log(`Processing reminder for seminar ${seminarId}`);

    const seminar = await this.prisma.seminar.findUnique({
      where: { id: seminarId },
    });
    if (!seminar || seminar.status !== 'PUBLISHED') {
      this.logger.warn(
        `Seminar ${seminarId} not found or not published, skipping reminder`,
      );
      return;
    }

    // Get all registered contacts for this seminar
    const registrations = await this.prisma.registration.findMany({
      where: { seminarId, status: 'REGISTERED' },
      include: { contact: true },
    });

    this.logger.log(
      `Would send reminder to ${registrations.length} contacts for "${seminar.title}"`,
    );
    // TODO: Actual email sending via EmailsService when Brevo is connected
  }
}
