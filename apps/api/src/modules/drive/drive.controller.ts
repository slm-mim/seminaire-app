import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { UserRole } from 'shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DriveService } from './drive.service';

@Controller('drive')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.ORGANIZER)
export class DriveController {
  constructor(private readonly driveService: DriveService) {}

  @Post('seminars/:seminarId/folder')
  createFolder(@Param('seminarId', ParseUUIDPipe) seminarId: string) {
    // Would be called on seminar publish — for now just stub
    return this.driveService.createSeminarFolder(seminarId, 'Test', new Date());
  }

  @Get('seminars/:seminarId/files')
  getSyncedFiles(@Param('seminarId', ParseUUIDPipe) seminarId: string) {
    return this.driveService.getSyncedFiles(seminarId);
  }

  @Post('seminars/:seminarId/export-attendance')
  exportAttendance(@Param('seminarId', ParseUUIDPipe) seminarId: string) {
    return this.driveService.exportAttendanceList(seminarId, '');
  }
}
