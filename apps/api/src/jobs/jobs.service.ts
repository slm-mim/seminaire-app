import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectQueue('reminders') private readonly remindersQueue: Queue,
    @InjectQueue('registration-close')
    private readonly registrationCloseQueue: Queue,
    @InjectQueue('brevo-sync') private readonly brevoSyncQueue: Queue,
  ) {}

  async scheduleReminder(seminarId: string, sendAt: Date) {
    const delay = sendAt.getTime() - Date.now();
    if (delay <= 0) {
      this.logger.warn(`Reminder date already passed for seminar ${seminarId}`);
      return;
    }

    await this.remindersQueue.add(
      'send-reminder',
      { seminarId },
      { delay, jobId: `reminder-${seminarId}`, removeOnComplete: true },
    );
    this.logger.log(
      `Scheduled reminder for seminar ${seminarId} at ${sendAt.toISOString()}`,
    );
  }

  async scheduleRegistrationClose(seminarId: string, closeAt: Date) {
    const delay = closeAt.getTime() - Date.now();
    if (delay <= 0) {
      this.logger.warn(
        `Registration close date already passed for seminar ${seminarId}`,
      );
      return;
    }

    await this.registrationCloseQueue.add(
      'close-registration',
      { seminarId },
      { delay, jobId: `close-${seminarId}`, removeOnComplete: true },
    );
    this.logger.log(
      `Scheduled registration close for seminar ${seminarId} at ${closeAt.toISOString()}`,
    );
  }

  async scheduleBrevoSync() {
    // Remove existing repeatable job if any
    const existing = await this.brevoSyncQueue.getRepeatableJobs();
    for (const job of existing) {
      await this.brevoSyncQueue.removeRepeatableByKey(job.key);
    }

    await this.brevoSyncQueue.add(
      'sync-contacts',
      {},
      { repeat: { every: 6 * 60 * 60 * 1000 } }, // Every 6 hours
    );
    this.logger.log('Scheduled Brevo sync every 6 hours');
  }

  async cancelReminder(seminarId: string) {
    const job = await this.remindersQueue.getJob(`reminder-${seminarId}`);
    if (job) await job.remove();
  }

  async cancelRegistrationClose(seminarId: string) {
    const job = await this.registrationCloseQueue.getJob(`close-${seminarId}`);
    if (job) await job.remove();
  }
}
