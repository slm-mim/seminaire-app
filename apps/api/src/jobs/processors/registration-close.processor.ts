import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';

@Processor('registration-close')
export class RegistrationCloseProcessor extends WorkerHost {
  private readonly logger = new Logger(RegistrationCloseProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<{ seminarId: string }>) {
    const { seminarId } = job.data;
    this.logger.log(`Closing registrations for seminar ${seminarId}`);

    const seminar = await this.prisma.seminar.findUnique({
      where: { id: seminarId },
    });
    if (!seminar || seminar.status !== 'PUBLISHED') {
      this.logger.warn(
        `Seminar ${seminarId} not found or not published, skipping close`,
      );
      return;
    }

    await this.prisma.seminar.update({
      where: { id: seminarId },
      data: { status: 'CLOSED' },
    });

    this.logger.log(`Registrations closed for "${seminar.title}"`);
  }
}
