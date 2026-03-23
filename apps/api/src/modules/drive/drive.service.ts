import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, drive_v3 } from 'googleapis';
import { PrismaService } from '../../prisma/prisma.service';
import { DriveSyncType } from 'shared-types';
import { Readable } from 'stream';

@Injectable()
export class DriveService {
  private readonly logger = new Logger(DriveService.name);
  private drive: drive_v3.Drive | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.initDrive();
  }

  private initDrive() {
    const clientId = this.configService.get('GOOGLE_DRIVE_CLIENT_ID');
    const clientSecret = this.configService.get('GOOGLE_DRIVE_CLIENT_SECRET');
    const refreshToken = this.configService.get('GOOGLE_DRIVE_REFRESH_TOKEN');

    if (!clientId || !clientSecret || !refreshToken) {
      this.logger.warn('Google Drive credentials not configured');
      return;
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    this.drive = google.drive({ version: 'v3', auth: oauth2Client });
    this.logger.log('Google Drive API initialized');
  }

  async createSeminarFolder(
    seminarId: string,
    title: string,
    date: Date,
  ): Promise<string | null> {
    if (!this.drive) {
      this.logger.warn('Google Drive not configured, skipping folder creation');
      return null;
    }

    try {
      const parentFolderId = this.configService.get('GOOGLE_DRIVE_FOLDER_ID');
      const folderName = `Séminaire - ${title} - ${date.toLocaleDateString('fr-FR')}`;

      // Create main folder
      const mainFolder = await this.drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: parentFolderId ? [parentFolderId] : undefined,
        },
        fields: 'id',
      });

      const mainFolderId = mainFolder.data.id!;

      // Create subfolders
      const subfolders = ['Présentation', 'Ressources', "Liste d'accueil"];
      for (const name of subfolders) {
        await this.drive.files.create({
          requestBody: {
            name,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [mainFolderId],
          },
        });
      }

      // Update seminar with folder ID
      await this.prisma.seminar.update({
        where: { id: seminarId },
        data: { driveFolder: mainFolderId },
      });

      this.logger.log(`Created Drive folder "${folderName}" (${mainFolderId})`);
      return mainFolderId;
    } catch (error) {
      this.logger.error('Failed to create Drive folder', error);
      return null;
    }
  }

  async uploadFile(
    seminarId: string,
    fileName: string,
    content: Buffer,
    type: DriveSyncType,
  ): Promise<void> {
    if (!this.drive) {
      this.logger.warn('Google Drive not configured, skipping upload');
      return;
    }

    try {
      const seminar = await this.prisma.seminar.findUnique({
        where: { id: seminarId },
      });
      if (!seminar?.driveFolder) {
        this.logger.warn(`No Drive folder for seminar ${seminarId}`);
        return;
      }

      // Find the right subfolder
      const subfolderName =
        type === 'PRESENTATION'
          ? 'Présentation'
          : type === 'RESOURCE'
            ? 'Ressources'
            : "Liste d'accueil";

      const subfolders = await this.drive.files.list({
        q: `'${seminar.driveFolder}' in parents and name = '${subfolderName}' and mimeType = 'application/vnd.google-apps.folder'`,
        fields: 'files(id)',
      });

      const parentId = subfolders.data.files?.[0]?.id || seminar.driveFolder;

      const stream = new Readable();
      stream.push(content);
      stream.push(null);

      const file = await this.drive.files.create({
        requestBody: {
          name: fileName,
          parents: [parentId],
        },
        media: {
          body: stream,
        },
        fields: 'id, name',
      });

      // Record in database
      await this.prisma.driveSync.create({
        data: {
          seminarId,
          fileId: file.data.id!,
          fileName,
          type,
        },
      });

      this.logger.log(`Uploaded "${fileName}" to Drive`);
    } catch (error) {
      this.logger.error(`Failed to upload ${fileName}`, error);
    }
  }

  async exportAttendanceList(
    seminarId: string,
    csvContent: string,
  ): Promise<void> {
    const buffer = Buffer.from(csvContent, 'utf-8');
    const date = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
    await this.uploadFile(
      seminarId,
      `liste-accueil-${date}.csv`,
      buffer,
      'ATTENDANCE_LIST' as DriveSyncType,
    );
  }

  async getSyncedFiles(seminarId: string) {
    return this.prisma.driveSync.findMany({
      where: { seminarId },
      orderBy: { syncedAt: 'desc' },
    });
  }
}
