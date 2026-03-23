import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { DriveSyncType } from 'shared-types';

@Injectable()
export class DriveService {
  private readonly logger = new Logger(DriveService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async createSeminarFolder(
    seminarId: string,
    title: string,
    date: Date,
  ): Promise<string | null> {
    // TODO: Create folder via Google Drive API
    // Structure: "Séminaire - {title} - {date}" with subfolders Présentation, Ressources, Liste d'accueil
    this.logger.log(`[STUB] Would create Drive folder for seminar: ${title}`);
    return null; // Would return folder ID
  }

  async uploadFile(
    seminarId: string,
    fileName: string,
    content: Buffer,
    type: DriveSyncType,
  ): Promise<void> {
    this.logger.log(`[STUB] Would upload ${fileName} to Drive`);
  }

  async exportAttendanceList(
    seminarId: string,
    csvContent: string,
  ): Promise<void> {
    this.logger.log(`[STUB] Would export attendance list to Drive`);
  }

  async getSyncedFiles(seminarId: string) {
    return this.prisma.driveSync.findMany({
      where: { seminarId },
      orderBy: { syncedAt: 'desc' },
    });
  }
}
